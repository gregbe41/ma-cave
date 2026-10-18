package fr.macave.app;

import android.accounts.Account;
import android.accounts.AccountManager;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;
import java.util.Collections;

/**
 * Accès au Google Drive de la personne, limité aux fichiers que l'appli a créés ou qu'on lui a désignés (drive.file).
 * Google refuse sa connexion et son sélecteur de fichiers dans une WebView : on passe par les services Google du
 * téléphone, qui affichent leurs propres écrans et rendent un jeton d'accès à la page.
 *   chooseAccount({ account }) → { account } : le sélecteur de comptes du téléphone (on peut aussi y ajouter un compte)
 *   connect({ account })  → { accessToken, scopes, email }
 *   pick({ account, fileIds, mimeTypes, multiple, folders }) → { accessToken, scopes, email, pickedIds }, pickedIds vide si on annule
 * Avec « account », l'accès est demandé pour ce compte Google précis ; sans, les services Google choisissent.
 * Il faut, dans le projet Google Cloud de l'appli, un client OAuth « Android » par identifiant d'appli (nom du paquet et
 * empreinte SHA-1 de la clé qui signe l'APK).
 */
@CapacitorPlugin(name = "GoogleDrive")
public class GoogleDrivePlugin extends Plugin {

    private static final String DRIVE_FILE = "https://www.googleapis.com/auth/drive.file";
    private ActivityResultLauncher<IntentSenderRequest> launcher;
    private ActivityResultLauncher<Intent> chooser;
    private PluginCall pending, choosing;

    @Override
    public void load() {
        launcher = getBridge().registerForActivityResult(new ActivityResultContracts.StartIntentSenderForResult(), this::onResult);
        chooser = getBridge().registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), this::onChosen);
    }

    /** Le compte Google demandé par la page (son adresse), ou null : les services Google choisissent alors eux-mêmes. */
    private static Account account(PluginCall call) {
        String a = call.getString("account", "");
        return a == null || a.isEmpty() ? null : new Account(a, "com.google");
    }

    /** Le sélecteur de comptes du téléphone : la personne choisit avec quel compte Google ouvrir ses caves. */
    @PluginMethod
    public void chooseAccount(PluginCall call) {
        if (choosing != null) {
            call.reject("Le choix du compte est déjà ouvert.");
            return;
        }
        choosing = call;
        chooser.launch(AccountManager.newChooseAccountIntent(account(call), null, new String[] { "com.google" }, null, null, null, null));
    }

    private void onChosen(ActivityResult result) {
        PluginCall call = choosing;
        choosing = null;
        if (call == null) return;
        String name = result.getData() == null ? null : result.getData().getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
        if (result.getResultCode() != Activity.RESULT_OK || name == null || name.isEmpty()) {
            call.reject("Annulé.", "cancelled");
            return;
        }
        JSObject ret = new JSObject();
        ret.put("account", name);
        call.resolve(ret);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        AuthorizationRequest.Builder b = AuthorizationRequest.builder()
            .setRequestedScopes(Collections.singletonList(new Scope(DRIVE_FILE)));
        Account a = account(call);
        if (a != null) b.setAccount(a);
        authorize(call, b.build());
    }

    /** Le sélecteur de Google ; avec fileIds, il ne montre que ces fichiers : rejoindre une cave se fait en un geste. */
    @PluginMethod
    public void pick(PluginCall call) {
        AuthorizationRequest.Builder b = AuthorizationRequest.builder()
            .setRequestedScopes(Collections.singletonList(new Scope(DRIVE_FILE)))
            .setOptOutIncludingGrantedScopes(true)
            .setPrompt(AuthorizationRequest.Prompt.CONSENT)
            .addResourceParameter(AuthorizationRequest.ResourceParameter.PICKER_OAUTH_TRIGGER, "true");
        Account a = account(call);
        if (a != null) b.setAccount(a);
        String ids = call.getString("fileIds", ""), mimes = call.getString("mimeTypes", "");
        if (!ids.isEmpty()) b.addResourceParameter(AuthorizationRequest.ResourceParameter.PICKER_FILE_IDS, ids);
        if (!mimes.isEmpty()) b.addResourceParameter(AuthorizationRequest.ResourceParameter.PICKER_MIMETYPES, mimes);
        if (Boolean.TRUE.equals(call.getBoolean("multiple", false))) b.addResourceParameter(AuthorizationRequest.ResourceParameter.PICKER_ALLOW_MULTIPLE, "true");
        if (Boolean.TRUE.equals(call.getBoolean("folders", false))) b.addResourceParameter(AuthorizationRequest.ResourceParameter.PICKER_ALLOW_FOLDER_SELECTION, "true");
        authorize(call, b.build());
    }

    private void authorize(PluginCall call, AuthorizationRequest req) {
        if (pending != null) {
            call.reject("Une demande à Google est déjà en cours.");
            return;
        }
        pending = call;
        Identity.getAuthorizationClient(getActivity()).authorize(req)
            .addOnSuccessListener(r -> {
                if (r.hasResolution() && r.getPendingIntent() != null) {
                    launcher.launch(new IntentSenderRequest.Builder(r.getPendingIntent().getIntentSender()).build());
                } else {
                    finish(r);
                }
            })
            .addOnFailureListener(e -> {
                pending = null;
                call.reject("Google n'a pas répondu : " + e.getMessage(), "unavailable", e);
            });
    }

    private void onResult(ActivityResult result) {
        PluginCall call = pending;
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            pending = null;
            call.reject("Annulé.", "cancelled");
            return;
        }
        try {
            finish(Identity.getAuthorizationClient(getActivity()).getAuthorizationResultFromIntent(result.getData()));
        } catch (ApiException e) {
            pending = null;
            call.reject("Accès refusé par Google : " + e.getMessage(), String.valueOf(e.getStatusCode()), e);
        }
    }

    private void finish(AuthorizationResult r) {
        PluginCall call = pending;
        pending = null;
        if (call == null) return;
        JSObject ret = new JSObject();
        ret.put("accessToken", r.getAccessToken());
        JSArray scopes = new JSArray();
        if (r.getGrantedScopes() != null) for (String s : r.getGrantedScopes()) scopes.put(s);
        ret.put("scopes", scopes);
        GoogleSignInAccount g = r.toGoogleSignInAccount();
        if (g != null && g.getEmail() != null) ret.put("email", g.getEmail());
        JSArray picked = new JSArray();
        JSObject params = new JSObject();
        Bundle p = r.getTokenResponseParams();
        if (p != null) {
            for (String k : p.keySet()) params.put(k, p.getString(k, ""));
            String ids = p.getString("picked_file_ids", "");
            if (ids != null) for (String id : ids.split(",")) if (!id.trim().isEmpty()) picked.put(id.trim());
        }
        ret.put("pickedIds", picked);
        ret.put("params", params);
        call.resolve(ret);
    }
}

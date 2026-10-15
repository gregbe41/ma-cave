package fr.macave.app;

import android.app.Activity;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.FileUtils;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult;

/**
 * Scanner d'étiquette : ouvre le scanner de documents de Google (ML Kit), qui repère l'étiquette pendant
 * qu'on vise, la recadre et la redresse. Il tourne dans les services Google : pas d'autorisation d'appareil
 * photo pour l'appli. Renvoie, pour chaque photo, une adresse que la page peut lire (webPath).
 */
@CapacitorPlugin(name = "LabelScanner")
public class LabelScannerPlugin extends Plugin {

    private ActivityResultLauncher<IntentSenderRequest> launcher;
    private PluginCall pending;

    @Override
    public void load() {
        launcher = getBridge().registerForActivityResult(new ActivityResultContracts.StartIntentSenderForResult(), this::onResult);
    }

    /** { pages: nombre de photos au plus } → { pages: [{ webPath }] }, vide si la personne annule. */
    @PluginMethod
    public void scan(PluginCall call) {
        if (pending != null) {
            call.reject("Un scan est déjà en cours.");
            return;
        }
        int pages = Math.max(1, Math.min(15, call.getInt("pages", 1)));
        GmsDocumentScannerOptions options = new GmsDocumentScannerOptions.Builder()
            .setGalleryImportAllowed(false)
            .setPageLimit(pages)
            .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
            .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
            .build();
        pending = call;
        GmsDocumentScanning.getClient(options)
            .getStartScanIntent(getActivity())
            .addOnSuccessListener(sender -> launcher.launch(new IntentSenderRequest.Builder(sender).build()))
            .addOnFailureListener(e -> {
                pending = null;
                call.reject("Scanner indisponible : " + e.getMessage(), "unavailable");
            });
    }

    private void onResult(ActivityResult result) {
        PluginCall call = pending;
        pending = null;
        if (call == null) return;
        JSArray out = new JSArray();
        if (result.getResultCode() == Activity.RESULT_OK) {
            GmsDocumentScanningResult r = GmsDocumentScanningResult.fromActivityResultIntent(result.getData());
            if (r != null && r.getPages() != null) {
                for (GmsDocumentScanningResult.Page page : r.getPages()) {
                    Uri u = page.getImageUri();
                    JSObject o = new JSObject();
                    o.put("webPath", FileUtils.getPortablePath(getContext(), getBridge().getLocalUrl(), u));
                    out.put(o);
                }
            }
        }
        JSObject ret = new JSObject();
        ret.put("pages", out);
        call.resolve(ret);
    }
}

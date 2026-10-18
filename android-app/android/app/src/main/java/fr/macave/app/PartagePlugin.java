package fr.macave.app;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * « Partager › Ma cave » : un lien partagé depuis le navigateur (ou une autre appli) arrive dans la page, qui le lit
 * dans Conseil (« Vu en ligne ? »). Au démarrage, le texte attend que la page le demande (recu) ; l'appli déjà
 * ouverte, il part tout de suite vers la page (événement « partage »), ou attend qu'elle le demande.
 */
@CapacitorPlugin(name = "Partage")
public class PartagePlugin extends Plugin {

    private String enAttente = null;

    @Override
    public void load() {
        garder(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        garder(intent);
        if (enAttente != null && hasListeners("partage")) {
            JSObject o = new JSObject();
            o.put("texte", enAttente);
            enAttente = null;
            notifyListeners("partage", o);
        }
    }

    /** { texte } : le texte partagé qui attend, vide s'il n'y en a pas. Il n'est rendu qu'une fois. */
    @PluginMethod
    public void recu(PluginCall call) {
        JSObject o = new JSObject();
        o.put("texte", enAttente == null ? "" : enAttente);
        enAttente = null;
        call.resolve(o);
    }

    private void garder(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
        String type = intent.getType();
        if (type == null || !type.startsWith("text/")) return;
        CharSequence t = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
        String s = t == null ? "" : t.toString().trim();
        if (s.isEmpty()) return;
        enAttente = s.length() > 4000 ? s.substring(0, 4000) : s;
        // Lu une fois : l'intent ne doit pas resservir (retour dans l'appli, activité recréée).
        intent.setAction(Intent.ACTION_MAIN);
        intent.removeExtra(Intent.EXTRA_TEXT);
    }
}

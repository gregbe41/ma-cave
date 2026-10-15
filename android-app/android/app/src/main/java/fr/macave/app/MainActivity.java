package fr.macave.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins propres à l'appli, à déclarer avant le démarrage du pont avec la page.
        registerPlugin(LabelScannerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

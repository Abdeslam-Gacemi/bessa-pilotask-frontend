package dz.bessa.pilotask;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import dz.bessa.pilotask.offline.OfflineSyncPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App plugins (not from npm) must be registered before the bridge starts.
        registerPlugin(OfflineSyncPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

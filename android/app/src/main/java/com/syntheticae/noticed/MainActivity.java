package com.syntheticae.noticed;

import android.content.Context;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.addJavascriptInterface(new AndroidPrintBridge(this, webView), "AndroidPrintBridge");
        }
    }

    public static class AndroidPrintBridge {
        private final Context context;
        private final WebView webView;

        public AndroidPrintBridge(Context context, WebView webView) {
            this.context = context;
            this.webView = webView;
        }

        @JavascriptInterface
        public void print(String documentName) {
            if (context == null || webView == null) return;
            webView.post(() -> {
                try {
                    PrintManager printManager = (PrintManager) context.getSystemService(Context.PRINT_SERVICE);
                    if (printManager != null) {
                        String jobName = (documentName != null && !documentName.trim().isEmpty())
                                ? documentName.trim()
                                : "Folio Manuscript";
                        PrintDocumentAdapter printAdapter = webView.createPrintDocumentAdapter(jobName);
                        PrintAttributes.Builder builder = new PrintAttributes.Builder();
                        builder.setColorMode(PrintAttributes.COLOR_MODE_COLOR);
                        builder.setMediaSize(PrintAttributes.MediaSize.ISO_A4);
                        printManager.print(jobName, printAdapter, builder.build());
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }
    }
}

import WidgetKit
import SwiftUI
import AppIntents

#if canImport(AppIntents)

@available(iOS 18.0, *)
struct NoticedWriteControl: ControlWidget {
    init() {}

    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.syntheticae.noticed.control.write") {
            ControlWidgetButton(action: OpenURLIntent(URL(string: "noticed://write")!)) {
                Label("Write", systemImage: "square.and.pencil")
            }
        }
        .displayName("Write Entry")
        .description("Instantly compose a new thought or field note.")
    }
}

@available(iOS 18.0, *)
struct NoticedAudioControl: ControlWidget {
    init() {}

    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.syntheticae.noticed.control.audio") {
            ControlWidgetButton(action: OpenURLIntent(URL(string: "noticed://dictate")!)) {
                Label("Voice Memo", systemImage: "mic.fill")
            }
        }
        .displayName("Voice Memo")
        .description("Instantly record an acoustic audio reflection.")
    }
}

@available(iOS 18.0, *)
struct NoticedDarkroomControl: ControlWidget {
    init() {}

    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.syntheticae.noticed.control.darkroom") {
            ControlWidgetButton(action: OpenURLIntent(URL(string: "noticed://darkroom")!)) {
                Label("Darkroom Film", systemImage: "camera.fill")
            }
        }
        .displayName("Darkroom Film")
        .description("Open 35mm analog camera mode in Noticed.")
    }
}

#endif

import WidgetKit
import SwiftUI
import AppIntents

#if canImport(AppIntents)

@available(iOS 18.0, *)
struct NoticedWriteControlIntent: AppIntent {
    static var title: LocalizedStringResource = "Write Note"
    static var description = IntentDescription("Open Noticed directly into note composition")
    static var openAppWhenRun: Bool = true

    init() {}

    @MainActor
    func perform() async throws -> some IntentResult & OpensIntent {
        let suiteName = "group.com.syntheticae.noticed"
        let defaults = UserDefaults(suiteName: suiteName) ?? UserDefaults.standard
        defaults.set("write", forKey: "noticed_pending_widget_action")
        defaults.synchronize()
        return .result(opensIntent: OpenURLIntent(URL(string: "noticed://write")!))
    }
}

@available(iOS 18.0, *)
struct NoticedAudioControlIntent: AppIntent {
    static var title: LocalizedStringResource = "Record Voice Memo"
    static var description = IntentDescription("Open Noticed to record acoustic voice memo")
    static var openAppWhenRun: Bool = true

    init() {}

    @MainActor
    func perform() async throws -> some IntentResult & OpensIntent {
        let suiteName = "group.com.syntheticae.noticed"
        let defaults = UserDefaults(suiteName: suiteName) ?? UserDefaults.standard
        defaults.set("dictate", forKey: "noticed_pending_widget_action")
        defaults.synchronize()
        return .result(opensIntent: OpenURLIntent(URL(string: "noticed://dictate")!))
    }
}

@available(iOS 18.0, *)
struct NoticedDarkroomControlIntent: AppIntent {
    static var title: LocalizedStringResource = "Darkroom Film"
    static var description = IntentDescription("Open Noticed 35mm Darkroom camera")
    static var openAppWhenRun: Bool = true

    init() {}

    @MainActor
    func perform() async throws -> some IntentResult & OpensIntent {
        let suiteName = "group.com.syntheticae.noticed"
        let defaults = UserDefaults(suiteName: suiteName) ?? UserDefaults.standard
        defaults.set("darkroom", forKey: "noticed_pending_widget_action")
        defaults.synchronize()
        return .result(opensIntent: OpenURLIntent(URL(string: "noticed://darkroom")!))
    }
}

@available(iOS 18.0, *)
struct NoticedWriteControl: ControlWidget {
    init() {}

    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.syntheticae.noticed.control.write") {
            ControlWidgetButton(action: NoticedWriteControlIntent()) {
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
            ControlWidgetButton(action: NoticedAudioControlIntent()) {
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
            ControlWidgetButton(action: NoticedDarkroomControlIntent()) {
                Label("Darkroom Film", systemImage: "camera.fill")
            }
        }
        .displayName("Darkroom Film")
        .description("Open 35mm analog camera mode in Noticed.")
    }
}

#endif

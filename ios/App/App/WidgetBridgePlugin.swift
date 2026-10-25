import Foundation
import Capacitor
import WidgetKit

/**
 * WidgetBridgePlugin
 * Capacitor native bridge connecting Noticed Web / React state with iOS WidgetKit
 * and App Groups.
 *
 * App Group: group.com.syntheticae.noticed
 */
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPendingAction", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearPendingAction", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveThumbnail", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reloadWidgets", returnType: CAPPluginReturnPromise)
    ]

    private let appGroupIdentifier = "group.com.syntheticae.noticed"

    private var sharedDefaults: UserDefaults {
        return UserDefaults(suiteName: appGroupIdentifier) ?? UserDefaults.standard
    }

    private var appGroupFolderURL: URL? {
        return FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupIdentifier)
    }

    /**
     * Updates the full editorial and literary snapshot in App Group UserDefaults.
     * Widgets immediately consume this data.
     */
    @objc public func updateSnapshot(_ call: CAPPluginCall) {
        guard let snapshot = call.getObject("snapshot") else {
            call.reject("Invalid snapshot data")
            return
        }

        sharedDefaults.set(snapshot, forKey: "noticed_widget_snapshot")
        if let jsonData = try? JSONSerialization.data(withJSONObject: snapshot, options: []) {
            sharedDefaults.set(jsonData, forKey: "noticed_widget_snapshot_data")
        }
        sharedDefaults.set(Date().timeIntervalSince1970, forKey: "noticed_widget_last_synced")
        sharedDefaults.synchronize()

        // Tell WidgetKit to reload all widget timelines immediately
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }

        call.resolve(["success": true])
    }

    /**
     * Saves a base64-encoded image thumbnail into the shared App Group directory
     * so that the Darkroom Polaroid widget can load it via file URL.
     */
    @objc public func saveThumbnail(_ call: CAPPluginCall) {
        guard let base64Data = call.getString("base64Data"),
              let fileName = call.getString("fileName") else {
            call.reject("Missing base64Data or fileName")
            return
        }

        guard let groupURL = appGroupFolderURL else {
            call.reject("Unable to resolve App Group container URL")
            return
        }

        let cleanBase64 = base64Data.components(separatedBy: ",").last ?? base64Data
        guard let data = Data(base64Encoded: cleanBase64) else {
            call.reject("Invalid base64 payload")
            return
        }

        let fileURL = groupURL.appendingPathComponent(fileName)
        do {
            try data.write(to: fileURL, options: .atomic)
            call.resolve([
                "success": true,
                "filePath": fileURL.path
            ])
        } catch {
            call.reject("Failed writing thumbnail: \(error.localizedDescription)")
        }
    }

    /**
     * Returns any pending action triggered from Widget deep-links (e.g. write, dictate, darkroom).
     */
    @objc public func getPendingAction(_ call: CAPPluginCall) {
        let action = sharedDefaults.string(forKey: "noticed_pending_widget_action")
        let spaceId = sharedDefaults.string(forKey: "noticed_pending_widget_space_id")

        call.resolve([
            "action": action as Any,
            "spaceId": spaceId as Any
        ])
    }

    /**
     * Clears the pending widget action once processed by the React app.
     */
    @objc public func clearPendingAction(_ call: CAPPluginCall) {
        sharedDefaults.removeObject(forKey: "noticed_pending_widget_action")
        sharedDefaults.removeObject(forKey: "noticed_pending_widget_space_id")
        sharedDefaults.synchronize()

        call.resolve(["success": true])
    }

    /**
     * Forces WidgetKit to reload all widget timelines on demand.
     */
    @objc public func reloadWidgets(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve(["success": true])
    }
}

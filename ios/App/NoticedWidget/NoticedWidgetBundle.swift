import WidgetKit
import SwiftUI

struct NoticedHomeWidgets: WidgetBundle {
    var body: some Widget {
        BookshelfShowcaseWidget()
        DarkroomDiaryWidget()
        WritingMarginaliaWidget()
        QuickCaptureDeskWidget()
        ActiveFolioTriBandWidget()
        DailyMarginaliaWidget()
        BookshelfStackWidget()
    }
}

@available(iOS 16.0, *)
struct NoticedLockScreenWidgets: WidgetBundle {
    var body: some Widget {
        LockScreenExcerptWidget()
        LockScreenHabitWidget()
        LockScreenQuickNoteWidget()
        LockScreenVoiceMemoWidget()
        LockScreenInlineWidget()
    }
}

@available(iOS 18.0, *)
struct NoticedControlWidgetsBundle: WidgetBundle {
    var body: some Widget {
        NoticedWriteControl()
        NoticedAudioControl()
        NoticedDarkroomControl()
    }
}

@main
struct NoticedWidgetBundle: WidgetBundle {
    var body: some Widget {
        NoticedHomeWidgets().body
        if #available(iOS 16.0, *) {
            NoticedLockScreenWidgets().body
        }
        if #available(iOS 18.0, *) {
            NoticedControlWidgetsBundle().body
        }
    }
}

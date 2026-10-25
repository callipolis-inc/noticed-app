import WidgetKit
import SwiftUI

// MARK: - 1. Rectangular Lock Screen: Active Folio Excerpt
public struct LockScreenExcerptWidget: Widget {
    public let kind: String = "NoticedLockScreenExcerpt"

    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NoticedTimelineProvider()) { entry in
            LockScreenExcerptView(entry: entry)
        }
        .configurationDisplayName("Lock Screen Excerpt")
        .description("Displays your latest manuscript excerpt directly on the Lock Screen.")
        .supportedFamilies([.accessoryRectangular])
    }
}

struct LockScreenExcerptView: View {
    let entry: NoticedTimelineEntry
    var s: NoticedWidgetSnapshot { entry.snapshot }

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 4) {
                Image(systemName: "book.closed")
                    .font(.system(size: 9))
                Text(s.activeSpaceTitle)
                    .font(.system(size: 9, weight: .bold))
                    .lineLimit(1)
            }
            Text("“\(s.latestNote.excerpt)”")
                .font(.system(size: 11, design: .serif))
                .italic()
                .lineLimit(2)
        }
        .widgetURL(URL(string: "noticed://space/\(s.activeSpaceId)"))
    }
}

// MARK: - 2. Rectangular Lock Screen: Habit & Streak Matrix
public struct LockScreenHabitWidget: Widget {
    public let kind: String = "NoticedLockScreenHabit"

    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NoticedTimelineProvider()) { entry in
            LockScreenHabitView(entry: entry)
        }
        .configurationDisplayName("Lock Screen Habit")
        .description("Track your writing streak and daily word goal on your Lock Screen.")
        .supportedFamilies([.accessoryRectangular])
    }
}

struct LockScreenHabitView: View {
    let entry: NoticedTimelineEntry
    var s: NoticedWidgetSnapshot { entry.snapshot }

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text("\(s.streakDays) DAYS STREAK")
                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                Spacer()
                Text("\(s.weeklyWordsCount) w")
                    .font(.system(size: 9, weight: .medium, design: .monospaced))
            }
            // Progress Bar
            ProgressView(value: Double(min(s.weeklyWordsCount, 3000)), total: 3000)
                .progressViewStyle(.linear)

            Text("\(s.totalNotesCount) notes across \(s.totalSpacesCount) volumes")
                .font(.system(size: 8.5))
                .foregroundColor(.secondary)
                .lineLimit(1)
        }
        .widgetURL(URL(string: "noticed://write"))
    }
}

// MARK: - 3. Circular Lock Screen: Quick Write Entry
public struct LockScreenQuickNoteWidget: Widget {
    public let kind: String = "NoticedLockScreenQuickNote"

    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NoticedTimelineProvider()) { entry in
            LockScreenQuickNoteView(entry: entry)
        }
        .configurationDisplayName("Quick Note")
        .description("One-tap shortcut from Lock Screen to compose a new note in Noticed.")
        .supportedFamilies([.accessoryCircular])
    }
}

struct LockScreenQuickNoteView: View {
    let entry: NoticedTimelineEntry

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 1) {
                Image(systemName: "square.and.pencil")
                    .font(.system(size: 15, weight: .semibold))
                Text("WRITE")
                    .font(.system(size: 7, weight: .bold, design: .monospaced))
            }
        }
        .widgetURL(URL(string: "noticed://write"))
    }
}

// MARK: - 4. Circular Lock Screen: Audio Voice Dictation
public struct LockScreenVoiceMemoWidget: Widget {
    public let kind: String = "NoticedLockScreenVoiceMemo"

    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NoticedTimelineProvider()) { entry in
            LockScreenVoiceMemoView(entry: entry)
        }
        .configurationDisplayName("Voice Dictation")
        .description("One-tap shortcut to record tactile voice memos into your folio.")
        .supportedFamilies([.accessoryCircular])
    }
}

struct LockScreenVoiceMemoView: View {
    let entry: NoticedTimelineEntry

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 1) {
                Image(systemName: "mic.fill")
                    .font(.system(size: 15, weight: .semibold))
                Text("AUDIO")
                    .font(.system(size: 7, weight: .bold, design: .monospaced))
            }
        }
        .widgetURL(URL(string: "noticed://dictate"))
    }
}

// MARK: - 5. Inline Lock Screen: Continuous Streak
public struct LockScreenInlineWidget: Widget {
    public let kind: String = "NoticedLockScreenInline"

    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NoticedTimelineProvider()) { entry in
            LockScreenInlineView(entry: entry)
        }
        .configurationDisplayName("Inline Status")
        .description("Shows your active streak and current folio above the Lock Screen clock.")
        .supportedFamilies([.accessoryInline])
    }
}

struct LockScreenInlineView: View {
    let entry: NoticedTimelineEntry
    var s: NoticedWidgetSnapshot { entry.snapshot }

    var body: some View {
        Text("Noticed: \(s.streakDays)d streak • \(s.activeSpaceTitle)")
            .widgetURL(URL(string: "noticed://space/\(s.activeSpaceId)"))
    }
}

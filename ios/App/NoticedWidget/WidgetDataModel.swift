import Foundation
import WidgetKit
import SwiftUI

// MARK: - App Group Suite Identifier
public let NOTICED_APP_GROUP_ID = "group.com.syntheticae.noticed"

// MARK: - Data Models Matching TypeScript NoticedWidgetSnapshot

public struct WidgetBookSpine: Codable, Identifiable {
    public let id: String
    public let title: String
    public let volumeNumber: String
    public let coverStyle: String
    public let colorHex: String
    public let foilColor: String
    public let notesCount: Int
    public let latestNoteTitle: String
    public let latestNoteExcerpt: String
    public let latestNoteDate: String
}

public struct WidgetHeatmapDay: Codable, Identifiable {
    public var id: String { dateStr }
    public let dayLabel: String
    public let dayName: String
    public let dateStr: String
    public let words: Int
    public let intensity: Int
    public let isToday: Bool
}

public struct WidgetNoteSnippet: Codable, Identifiable {
    public let id: String
    public let title: String
    public let excerpt: String
    public let dateFormatted: String
    public let spaceTitle: String
    public let marginalia: String
    public let hasAudio: Bool
    public let audioDurationFormatted: String?
    public let hasPhoto: Bool
    public let photoUrl: String?
    public let locationName: String?
}

public struct WidgetDailyWhisper: Codable {
    public let title: String
    public let quote: String
    public let sourceOrSpace: String
    public let progressPercent: Int
    public let wordCount: Int
}

public struct NoticedWidgetSnapshot: Codable {
    public let language: String
    public let theme: String
    public let authorName: String
    public let activeSpaceId: String
    public let activeSpaceTitle: String
    public let activeSpaceCoverColor: String
    public let activeSpaceFoil: String
    public let totalSpacesCount: Int
    public let totalNotesCount: Int
    public let totalWordsCount: Int
    public let streakDays: Int
    public let weeklyWordsCount: Int
    public let weeklyHeatmap: [WidgetHeatmapDay]
    public let bookshelves: [WidgetBookSpine]
    public let latestNote: WidgetNoteSnippet
    public let dailyWhisper: WidgetDailyWhisper
    public let lastSyncedTimestamp: Double
}

// MARK: - Snapshot Storage Provider

struct WidgetDataProvider {
    static func loadSnapshot() -> NoticedWidgetSnapshot {
        let defaults = UserDefaults(suiteName: NOTICED_APP_GROUP_ID) ?? UserDefaults.standard

        if let data = defaults.data(forKey: "noticed_widget_snapshot_data") {
            let decoder = JSONDecoder()
            if let decoded = try? decoder.decode(NoticedWidgetSnapshot.self, from: data) {
                return decoded
            }
        }

        // Return default graceful starter snapshot
        return placeholderSnapshot()
    }

    static func placeholderSnapshot() -> NoticedWidgetSnapshot {
        let emptyHeatmap = [
            WidgetHeatmapDay(dayLabel: "M", dayName: "Mon", dateStr: "", words: 0, intensity: 0, isToday: false),
            WidgetHeatmapDay(dayLabel: "T", dayName: "Tue", dateStr: "", words: 0, intensity: 0, isToday: false),
            WidgetHeatmapDay(dayLabel: "W", dayName: "Wed", dateStr: "", words: 0, intensity: 0, isToday: false),
            WidgetHeatmapDay(dayLabel: "T", dayName: "Thu", dateStr: "", words: 0, intensity: 0, isToday: false),
            WidgetHeatmapDay(dayLabel: "F", dayName: "Fri", dateStr: "", words: 0, intensity: 0, isToday: false),
            WidgetHeatmapDay(dayLabel: "S", dayName: "Sat", dateStr: "", words: 0, intensity: 0, isToday: true),
            WidgetHeatmapDay(dayLabel: "S", dayName: "Sun", dateStr: "", words: 0, intensity: 0, isToday: false),
        ]

        let emptySpines = [
            WidgetBookSpine(
                id: "default",
                title: "Field Notes",
                volumeNumber: "VOL. I",
                coverStyle: "kraft",
                colorHex: "#C2410C",
                foilColor: "gold",
                notesCount: 0,
                latestNoteTitle: "No notes yet",
                latestNoteExcerpt: "Begin capturing your thoughts in Noticed.",
                latestNoteDate: ""
            )
        ]

        return NoticedWidgetSnapshot(
            language: "en",
            theme: "dark",
            authorName: "Author",
            activeSpaceId: "default",
            activeSpaceTitle: "Field Notes",
            activeSpaceCoverColor: "#C2410C",
            activeSpaceFoil: "gold",
            totalSpacesCount: 1,
            totalNotesCount: 0,
            totalWordsCount: 0,
            streakDays: 0,
            weeklyWordsCount: 0,
            weeklyHeatmap: emptyHeatmap,
            bookshelves: emptySpines,
            latestNote: WidgetNoteSnippet(
                id: "empty",
                title: "Field Notes",
                excerpt: "Begin capturing your thoughts in Noticed.",
                dateFormatted: "",
                spaceTitle: "Field Notes",
                marginalia: "Every thought noticed is a preservation against forgetfulness.",
                hasAudio: false,
                audioDurationFormatted: nil,
                hasPhoto: false,
                photoUrl: nil,
                locationName: nil
            ),
            dailyWhisper: WidgetDailyWhisper(
                title: "Noticed Atelier",
                quote: "Silence between two sentences holds more truth than twenty pages of prose.",
                sourceOrSpace: "Field Notes",
                progressPercent: 0,
                wordCount: 0
            ),
            lastSyncedTimestamp: Date().timeIntervalSince1970
        )
    }
}

// MARK: - Color Hex Parser Extension

extension Color {
    init(hex: String) {
        let cleanHex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: cleanHex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch cleanHex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 194, 65, 12)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Bilingual Localization Helper

struct NoticedI18n {
    static func t(_ key: String, lang: String) -> String {
        let isId = lang.lowercased() == "id"
        switch key {
        case "brand": return "NOTICED ATELIER"
        case "curated_bookshelf": return isId ? "Rak Buku Pilihan" : "Curated Bookshelf"
        case "spaces": return isId ? "Jilid" : "Spaces"
        case "notes": return isId ? "Catatan" : "Notes"
        case "words": return isId ? "kata" : "words"
        case "streak": return isId ? "HARI RUTIN" : "STREAK"
        case "days": return isId ? "Hari" : "Days"
        case "open_folio": return isId ? "Buka Buku" : "Open Folio"
        case "open_darkroom": return isId ? "Buka Kamar Gelap" : "Open Darkroom"
        case "darkroom_film": return isId ? "FILM KAMAR GELAP" : "DARKROOM FILM"
        case "voice_memo": return isId ? "Memo Suara" : "Voice Memo"
        case "author_chronicle": return isId ? "KRONIK PENULIS" : "AUTHOR CHRONICLE"
        case "words_marginalia": return isId ? "Kata & Marginalia" : "Words & Marginalia"
        case "this_week_rhythm": return isId ? "RITME MINGGU INI" : "THIS WEEK'S RHYTHM"
        case "words_captured": return isId ? "kata terabadikan" : "words captured"
        case "continue_writing": return isId ? "Lanjutkan Menulis" : "Continue Writing"
        case "search_notes": return isId ? "Cari Catatan" : "Search Notes"
        case "quick_write": return isId ? "Tulis" : "Write"
        case "quick_darkroom": return isId ? "Kamar Gelap" : "Darkroom"
        case "quick_dictate": return isId ? "Dikte" : "Dictate"
        case "daily_whisper": return isId ? "BISIKAN HARIAN" : "DAILY WHISPER"
        case "by_author": return isId ? "Oleh" : "By"
        default: return key
        }
    }
}

// MARK: - Timeline Entry for WidgetKit

struct NoticedTimelineEntry: TimelineEntry {
    let date: Date
    let snapshot: NoticedWidgetSnapshot
}

struct NoticedTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> NoticedTimelineEntry {
        NoticedTimelineEntry(date: Date(), snapshot: WidgetDataProvider.placeholderSnapshot())
    }

    func getSnapshot(in context: Context, completion: @escaping (NoticedTimelineEntry) -> Void) {
        let snapshot = WidgetDataProvider.loadSnapshot()
        let entry = NoticedTimelineEntry(date: Date(), snapshot: snapshot)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NoticedTimelineEntry>) -> Void) {
        let snapshot = WidgetDataProvider.loadSnapshot()
        let currentDate = Date()
        let entry = NoticedTimelineEntry(date: currentDate, snapshot: snapshot)
        // Refresh every 30 minutes or when triggered by app sync
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: currentDate) ?? currentDate.addingTimeInterval(1800)
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

import WidgetKit
import SwiftUI

// MARK: - 1. FULL LARGE: Curated Bookshelf Showcase
struct BookshelfShowcaseWidget: Widget {
    let kind: String = "NoticedBookshelfShowcase"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NoticedTimelineProvider()) { entry in
            BookshelfShowcaseView(entry: entry)
        }
        .configurationDisplayName("Curated Bookshelf")
        .description("Explore your atelier's manuscript spines and active drafts directly from your Home Screen.")
        .supportedFamilies([.systemLarge])
    }
}

struct BookshelfShowcaseView: View {
    let entry: NoticedTimelineEntry
    var s: NoticedWidgetSnapshot { entry.snapshot }
    var lang: String { s.language }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header Bar
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(Color(hex: "#F59E0B"))
                            .frame(width: 6, height: 6)
                        Text(NoticedI18n.t("brand", lang: lang))
                            .font(.system(size: 9, weight: .medium, design: .monospaced))
                            .tracking(1.5)
                            .foregroundColor(Color.white.opacity(0.5))
                    }
                    Text(NoticedI18n.t("curated_bookshelf", lang: lang))
                        .font(.custom("CormorantGaramond-SemiBold", size: 18))
                        .foregroundColor(.white)
                }
                Spacer()
                Text("\(s.totalSpacesCount) \(NoticedI18n.t("spaces", lang: lang)) • \(s.totalNotesCount) \(NoticedI18n.t("notes", lang: lang))")
                    .font(.system(size: 9, weight: .medium, design: .monospaced))
                    .foregroundColor(Color.white.opacity(0.7))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.white.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
            }
            .padding(.bottom, 10)
            .overlay(
                Rectangle()
                    .fill(Color.white.opacity(0.08))
                    .frame(height: 1),
                alignment: .bottom
            )

            // Bookshelf Spines Display (4 Spines)
            HStack(spacing: 8) {
                ForEach(s.bookshelves.prefix(4)) { book in
                    VStack(alignment: .leading, spacing: 0) {
                        Text(book.volumeNumber)
                            .font(.system(size: 6.5, weight: .bold, design: .monospaced))
                            .foregroundColor(Color.white.opacity(0.7))
                            .tracking(1.0)
                        Spacer()
                        Text(book.title)
                            .font(.custom("CormorantGaramond-Bold", size: 10))
                            .foregroundColor(.white)
                            .lineLimit(2)
                            .minimumScaleFactor(0.8)
                        Spacer()
                        Rectangle()
                            .fill(Color(hex: book.foilColor == "gold" ? "#F59E0B" : "#F43F5E").opacity(0.7))
                            .frame(height: 2)
                            .clipShape(Capsule())
                    }
                    .padding(6)
                    .frame(maxWidth: .infinity, maxHeight: 96)
                    .background(Color(hex: book.colorHex))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(Color.white.opacity(0.2), lineWidth: 1)
                    )
                }
            }
            .padding(.vertical, 10)

            // Active Selected Book Excerpt Card
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(s.latestNote.title)
                        .font(.custom("CormorantGaramond-SemiBold", size: 13))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Spacer()
                    Text(s.latestNote.dateFormatted)
                        .font(.system(size: 9, design: .monospaced))
                        .foregroundColor(Color.white.opacity(0.4))
                }

                Text("“\(s.latestNote.excerpt)”")
                    .font(.custom("Newsreader-Italic", size: 11))
                    .foregroundColor(Color.white.opacity(0.75))
                    .lineLimit(2)
                    .lineSpacing(2)
            }
            .padding(10)
            .background(Color.white.opacity(0.04))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
            )

            Spacer()

            // Bottom Action Bar
            HStack(alignment: .center) {
                Text("\(NoticedI18n.t("by_author", lang: lang)) \(s.authorName)")
                    .font(.custom("Newsreader-Italic", size: 11))
                    .foregroundColor(Color.white.opacity(0.5))

                Spacer()

                Link(destination: URL(string: "noticed://space/\(s.activeSpaceId)")!) {
                    HStack(spacing: 4) {
                        Text(NoticedI18n.t("open_folio", lang: lang))
                            .font(.system(size: 11, weight: .semibold))
                        Image(systemName: "arrow.right")
                            .font(.system(size: 9, weight: .bold))
                    }
                    .foregroundColor(.black)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.white)
                    .clipShape(Capsule())
                }
            }
            .padding(.top, 8)
            .overlay(
                Rectangle()
                    .fill(Color.white.opacity(0.08))
                    .frame(height: 1),
                alignment: .top
            )
        }
        .padding(16)
        .background(Color(hex: "#111215"))
        .widgetURL(URL(string: "noticed://space/\(s.activeSpaceId)"))
    }
}

// MARK: - 2. FULL LARGE: Darkroom Diary & Audio Waveform Player
struct DarkroomDiaryWidget: Widget {
    let kind: String = "NoticedDarkroomDiary"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NoticedTimelineProvider()) { entry in
            DarkroomDiaryView(entry: entry)
        }
        .configurationDisplayName("Darkroom Diary")
        .description("An analog Polaroid showcase with tactile acoustic voice memos and film metadata.")
        .supportedFamilies([.systemLarge])
    }
}

struct DarkroomDiaryView: View {
    let entry: NoticedTimelineEntry
    var s: NoticedWidgetSnapshot { entry.snapshot }
    var lang: String { s.language }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                HStack(spacing: 5) {
                    Image(systemName: "camera.aperture")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(Color(hex: "#FB7185"))
                    Text("\(NoticedI18n.t("darkroom_film", lang: lang)) • PRINT #4")
                        .font(.system(size: 8.5, weight: .medium, design: .monospaced))
                        .tracking(1.2)
                        .foregroundColor(Color.white.opacity(0.6))
                }
                Spacer()
                Text("35MM ARCHIVAL")
                    .font(.system(size: 8, weight: .semibold, design: .monospaced))
                    .foregroundColor(Color(hex: "#F59E0B"))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color(hex: "#F59E0B").opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 4))
            }
            .padding(.bottom, 8)

            // Center Polaroid Frame
            VStack(spacing: 6) {
                // Photo Canvas
                ZStack {
                    LinearGradient(
                        colors: [Color(hex: "#292524"), Color(hex: "#1C1917"), Color(hex: "#0C0A09")],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )

                    VStack(spacing: 4) {
                        Image(systemName: "camera.viewfinder")
                            .font(.system(size: 26, weight: .light))
                            .foregroundColor(Color.white.opacity(0.35))
                        Text(s.latestNote.locationName ?? "Kyoto Atelier")
                            .font(.system(size: 7.5, weight: .medium, design: .monospaced))
                            .foregroundColor(Color.white.opacity(0.5))
                            .tracking(1.5)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: 112)
                .clipShape(RoundedRectangle(cornerRadius: 3))

                // Caption
                Text("“\(s.latestNote.excerpt)”")
                    .font(.custom("Newsreader-Italic", size: 10.5))
                    .foregroundColor(Color(hex: "#1C1917"))
                    .lineLimit(1)
                    .padding(.horizontal, 4)
            }
            .padding(7)
            .padding(.bottom, 6)
            .background(Color(hex: "#FAF9F5"))
            .clipShape(RoundedRectangle(cornerRadius: 4))
            .shadow(color: Color.black.opacity(0.3), radius: 8, y: 4)

            Spacer()

            // Acoustic Voice Memo Bar
            HStack(spacing: 10) {
                ZStack {
                    Circle()
                        .fill(Color.white)
                        .frame(width: 30, height: 30)
                    Image(systemName: "play.fill")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.black)
                        .offset(x: 1)
                }

                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text("\(NoticedI18n.t("voice_memo", lang: lang)) #14")
                            .font(.system(size: 8.5, weight: .semibold, design: .monospaced))
                            .foregroundColor(Color.white.opacity(0.7))
                        Spacer()
                        Text(s.latestNote.audioDurationFormatted ?? "01:42")
                            .font(.system(size: 8.5, design: .monospaced))
                            .foregroundColor(Color.white.opacity(0.5))
                    }

                    // Waveform Bars
                    HStack(spacing: 2.5) {
                        ForEach([6, 12, 8, 14, 5, 15, 10, 7, 11, 4, 9, 13], id: \.self) { height in
                            RoundedRectangle(cornerRadius: 1)
                                .fill(height > 10 ? Color(hex: "#FB7185") : Color.white.opacity(0.45))
                                .frame(width: 3, height: CGFloat(height))
                        }
                    }
                }
            }
            .padding(8)
            .background(Color.white.opacity(0.04))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
            )

            // Footer Link
            HStack {
                Text("\(s.latestNote.spaceTitle) • Audio Attached")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundColor(Color.white.opacity(0.4))
                Spacer()
                Link(destination: URL(string: "noticed://darkroom")!) {
                    Text(NoticedI18n.t("open_darkroom", lang: lang) + " →")
                        .font(.system(size: 10.5, weight: .semibold))
                        .foregroundColor(.white)
                }
            }
            .padding(.top, 8)
        }
        .padding(16)
        .background(Color(hex: "#0D0E11"))
        .widgetURL(URL(string: "noticed://darkroom"))
    }
}

// MARK: - 3. FULL LARGE: Literary Habit & Marginalia Matrix
struct WritingMarginaliaWidget: Widget {
    let kind: String = "NoticedWritingMarginalia"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NoticedTimelineProvider()) { entry in
            WritingMarginaliaView(entry: entry)
        }
        .configurationDisplayName("Words & Marginalia")
        .description("Track your weekly writing streak, word density matrix, and anchored marginalia thoughts.")
        .supportedFamilies([.systemLarge])
    }
}

struct WritingMarginaliaView: View {
    let entry: NoticedTimelineEntry
    var s: NoticedWidgetSnapshot { entry.snapshot }
    var lang: String { s.language }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header with Streak
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(NoticedI18n.t("author_chronicle", lang: lang))
                        .font(.system(size: 8.5, weight: .medium, design: .monospaced))
                        .tracking(1.5)
                        .foregroundColor(Color.white.opacity(0.4))
                    Text(NoticedI18n.t("words_marginalia", lang: lang))
                        .font(.custom("CormorantGaramond-SemiBold", size: 18))
                        .foregroundColor(.white)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 0) {
                    Text("\(s.streakDays) \(NoticedI18n.t("days", lang: lang))")
                        .font(.custom("CormorantGaramond-Bold", size: 20))
                        .foregroundColor(Color(hex: "#F59E0B"))
                    Text(NoticedI18n.t("streak", lang: lang))
                        .font(.system(size: 7.5, weight: .bold, design: .monospaced))
                        .foregroundColor(Color.white.opacity(0.4))
                        .tracking(1.0)
                }
            }
            .padding(.bottom, 10)
            .overlay(
                Rectangle()
                    .fill(Color.white.opacity(0.08))
                    .frame(height: 1),
                alignment: .bottom
            )

            // 7-Day Word Heatmap Matrix
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(NoticedI18n.t("this_week_rhythm", lang: lang))
                        .font(.system(size: 8.5, weight: .semibold, design: .monospaced))
                        .foregroundColor(Color.white.opacity(0.5))
                    Spacer()
                    Text("\(s.weeklyWordsCount) \(NoticedI18n.t("words_captured", lang: lang))")
                        .font(.system(size: 9, weight: .medium, design: .monospaced))
                        .foregroundColor(Color(hex: "#34D399"))
                }

                HStack(spacing: 5) {
                    ForEach(s.weeklyHeatmap) { day in
                        VStack(spacing: 4) {
                            RoundedRectangle(cornerRadius: 5)
                                .fill(heatmapColor(for: day.intensity))
                                .frame(height: 24)
                                .overlay(
                                    day.isToday ? RoundedRectangle(cornerRadius: 5).stroke(Color.white.opacity(0.8), lineWidth: 1.5) : nil
                                )
                            Text(day.dayLabel)
                                .font(.system(size: 8, weight: day.isToday ? .bold : .medium, design: .monospaced))
                                .foregroundColor(day.isToday ? .white : Color.white.opacity(0.4))
                        }
                    }
                }
            }
            .padding(10)
            .background(Color.white.opacity(0.04))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .padding(.top, 10)

            // Anchored Marginalia Quote
            VStack(alignment: .leading, spacing: 3) {
                Text("ANCHORED SIDENOTE")
                    .font(.system(size: 7.5, weight: .bold, design: .monospaced))
                    .tracking(1.2)
                    .foregroundColor(Color.white.opacity(0.35))
                Text("“\(s.dailyWhisper.quote)”")
                    .font(.custom("Newsreader-Italic", size: 11))
                    .foregroundColor(Color.white.opacity(0.85))
                    .lineLimit(2)
                    .lineSpacing(2)
                    .padding(8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.white.opacity(0.02))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                    .overlay(
                        Rectangle()
                            .fill(Color(hex: "#F59E0B").opacity(0.7))
                            .frame(width: 2.5),
                        alignment: .leading
                    )
            }
            .padding(.top, 8)

            Spacer()

            // Quick Action Buttons (Continue Writing & Search Notes)
            HStack(spacing: 8) {
                Link(destination: URL(string: "noticed://write")!) {
                    HStack(spacing: 5) {
                        Image(systemName: "square.and.pencil")
                            .font(.system(size: 11, weight: .semibold))
                        Text(NoticedI18n.t("continue_writing", lang: lang))
                            .font(.system(size: 10.5, weight: .semibold))
                    }
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                Link(destination: URL(string: "noticed://search")!) {
                    HStack(spacing: 5) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 11, weight: .semibold))
                        Text(NoticedI18n.t("search_notes", lang: lang))
                            .font(.system(size: 10.5, weight: .medium))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.white.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color.white.opacity(0.12), lineWidth: 1)
                    )
                }
            }
            .padding(.top, 8)
            .overlay(
                Rectangle()
                    .fill(Color.white.opacity(0.08))
                    .frame(height: 1),
                alignment: .top
            )
        }
        .padding(16)
        .background(Color(hex: "#141518"))
        .widgetURL(URL(string: "noticed://write"))
    }

    private func heatmapColor(for intensity: Int) -> Color {
        switch intensity {
        case 4: return Color(hex: "#F59E0B")
        case 3: return Color(hex: "#F59E0B").opacity(0.75)
        case 2: return Color(hex: "#F59E0B").opacity(0.45)
        case 1: return Color(hex: "#F59E0B").opacity(0.2)
        default: return Color.white.opacity(0.06)
        }
    }
}

// MARK: - 4. MEDIUM: Tactile Quick Capture Desk
struct QuickCaptureDeskWidget: Widget {
    let kind: String = "NoticedQuickCaptureDesk"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NoticedTimelineProvider()) { entry in
            QuickCaptureDeskView(entry: entry)
        }
        .configurationDisplayName("Quick Capture Desk")
        .description("Current folio status with one-tap actions for writing, darkroom film, and dictation.")
        .supportedFamilies([.systemMedium])
    }
}

struct QuickCaptureDeskView: View {
    let entry: NoticedTimelineEntry
    var s: NoticedWidgetSnapshot { entry.snapshot }
    var lang: String { s.language }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(s.activeSpaceTitle.uppercased())
                        .font(.system(size: 8, weight: .bold, design: .monospaced))
                        .tracking(1.2)
                        .foregroundColor(Color.white.opacity(0.4))
                    Text("“\(s.latestNote.title)”")
                        .font(.custom("CormorantGaramond-Medium", size: 15))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Text("\(s.totalNotesCount) \(NoticedI18n.t("notes", lang: lang)) • \(s.latestNote.dateFormatted)")
                        .font(.system(size: 9.5))
                        .foregroundColor(Color.white.opacity(0.45))
                }
                Spacer()
                Image(systemName: "feather")
                    .font(.system(size: 15, weight: .light))
                    .foregroundColor(Color.white.opacity(0.6))
                    .frame(width: 28, height: 28)
                    .background(Color.white.opacity(0.06))
                    .clipShape(Circle())
            }

            Spacer()

            HStack(spacing: 8) {
                Link(destination: URL(string: "noticed://write")!) {
                    HStack(spacing: 5) {
                        Circle()
                            .fill(Color(hex: "#34D399"))
                            .frame(width: 5, height: 5)
                        Text(NoticedI18n.t("quick_write", lang: lang))
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 7)
                    .background(Color.white.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                Link(destination: URL(string: "noticed://darkroom")!) {
                    HStack(spacing: 5) {
                        Circle()
                            .fill(Color(hex: "#F59E0B"))
                            .frame(width: 5, height: 5)
                        Text(NoticedI18n.t("quick_darkroom", lang: lang))
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 7)
                    .background(Color.white.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                Link(destination: URL(string: "noticed://dictate")!) {
                    HStack(spacing: 5) {
                        Circle()
                            .fill(Color(hex: "#FB7185"))
                            .frame(width: 5, height: 5)
                        Text(NoticedI18n.t("quick_dictate", lang: lang))
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 7)
                    .background(Color.white.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
        .padding(14)
        .background(Color(hex: "#14161A"))
        .widgetURL(URL(string: "noticed://space/\(s.activeSpaceId)"))
    }
}

// MARK: - 5. SMALL: Active Folio Penguin Classics Tri-Band
struct ActiveFolioTriBandWidget: Widget {
    let kind: String = "NoticedActiveFolioTriBand"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NoticedTimelineProvider()) { entry in
            ActiveFolioTriBandView(entry: entry)
        }
        .configurationDisplayName("Active Folio Tri-Band")
        .description("Classic Penguin Tri-Band editorial folio cover for your active notebook.")
        .supportedFamilies([.systemSmall])
    }
}

struct ActiveFolioTriBandView: View {
    let entry: NoticedTimelineEntry
    var s: NoticedWidgetSnapshot { entry.snapshot }

    var body: some View {
        VStack(spacing: 0) {
            // Top Band
            Text("NOTICED")
                .font(.system(size: 6.5, weight: .bold, design: .monospaced))
                .foregroundColor(Color.white.opacity(0.9))
                .tracking(1.5)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .background(Color(hex: s.activeSpaceCoverColor))

            // Middle Ivory Band
            VStack(spacing: 3) {
                Text(s.activeSpaceTitle)
                    .font(.custom("CormorantGaramond-Bold", size: 12))
                    .foregroundColor(Color(hex: "#1C1917"))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .padding(.horizontal, 6)

                Text(s.authorName)
                    .font(.system(size: 7.5, weight: .medium))
                    .foregroundColor(Color(hex: "#78716C"))
                    .tracking(0.5)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(hex: "#FCFBF9"))

            // Bottom Band
            HStack {
                Text("CLASSICS")
                    .font(.system(size: 6, weight: .bold, design: .monospaced))
                    .foregroundColor(Color.white.opacity(0.85))
                    .tracking(1.0)
                Spacer()
                Text("\(s.totalNotesCount) N")
                    .font(.system(size: 6, weight: .medium, design: .monospaced))
                    .foregroundColor(Color.white.opacity(0.85))
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .frame(maxWidth: .infinity)
            .background(Color(hex: s.activeSpaceCoverColor))
        }
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.black.opacity(0.2), lineWidth: 1)
        )
        .widgetURL(URL(string: "noticed://space/\(s.activeSpaceId)"))
    }
}

// MARK: - 6. SMALL: Daily Marginalia Whisper & Progress
struct DailyMarginaliaWidget: Widget {
    let kind: String = "NoticedDailyMarginalia"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NoticedTimelineProvider()) { entry in
            DailyMarginaliaView(entry: entry)
        }
        .configurationDisplayName("Daily Marginalia")
        .description("Daily quiet thought excerpt with writing progress ring on tactile ivory paper.")
        .supportedFamilies([.systemSmall])
    }
}

struct DailyMarginaliaView: View {
    let entry: NoticedTimelineEntry
    var s: NoticedWidgetSnapshot { entry.snapshot }
    var lang: String { s.language }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(NoticedI18n.t("daily_whisper", lang: lang))
                .font(.system(size: 7, weight: .bold, design: .monospaced))
                .tracking(1.2)
                .foregroundColor(Color(hex: "#78716C"))

            Text(s.dailyWhisper.title)
                .font(.custom("CormorantGaramond-Bold", size: 12))
                .foregroundColor(Color(hex: "#1C1917"))
                .lineLimit(1)
                .padding(.top, 1)

            Spacer()

            Text("“\(s.dailyWhisper.quote)”")
                .font(.custom("Newsreader-Italic", size: 10))
                .foregroundColor(Color(hex: "#44403C"))
                .lineLimit(3)
                .lineSpacing(2)

            Spacer()

            HStack {
                // Circular Progress
                ZStack {
                    Circle()
                        .stroke(Color(hex: "#E7E5E4"), lineWidth: 2)
                        .frame(width: 14, height: 14)
                    Circle()
                        .trim(from: 0, to: CGFloat(s.dailyWhisper.progressPercent) / 100)
                        .stroke(Color(hex: "#E11D48"), lineWidth: 2)
                        .frame(width: 14, height: 14)
                        .rotationEffect(.degrees(-90))
                }
                Text("\(s.dailyWhisper.progressPercent)% • \(s.dailyWhisper.wordCount) \(NoticedI18n.t("words", lang: lang))")
                    .font(.system(size: 8, weight: .medium, design: .monospaced))
                    .foregroundColor(Color(hex: "#78716C"))
            }
            .padding(.top, 4)
            .overlay(
                Rectangle()
                    .fill(Color(hex: "#E7E5E4"))
                    .frame(height: 1),
                alignment: .top
            )
        }
        .padding(12)
        .background(Color(hex: "#FAF8F5"))
        .widgetURL(URL(string: "noticed://write"))
    }
}

// MARK: - 7. SMALL: Bookshelf 3D Stack
struct BookshelfStackWidget: Widget {
    let kind: String = "NoticedBookshelfStack"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NoticedTimelineProvider()) { entry in
            BookshelfStackView(entry: entry)
        }
        .configurationDisplayName("Bookshelf Stack")
        .description("Layered folio stack showing your atelier manuscript volume count.")
        .supportedFamilies([.systemSmall])
    }
}

struct BookshelfStackView: View {
    let entry: NoticedTimelineEntry
    var s: NoticedWidgetSnapshot { entry.snapshot }

    var body: some View {
        VStack(spacing: 5) {
            HStack {
                Text("ATELIER STACK")
                    .font(.system(size: 7, weight: .bold, design: .monospaced))
                    .tracking(1.0)
                    .foregroundColor(Color.white.opacity(0.4))
                Spacer()
                Text("\(s.totalSpacesCount) VOLS")
                    .font(.system(size: 7.5, weight: .semibold, design: .monospaced))
                    .foregroundColor(Color(hex: "#F59E0B"))
            }

            Spacer()

            // 3 Horizontal Books Stacked with 3D drop shadows
            ForEach(s.bookshelves.prefix(3)) { book in
                HStack {
                    Rectangle()
                        .fill(Color(hex: book.foilColor == "gold" ? "#F59E0B" : "#F43F5E"))
                        .frame(width: 3)
                    Text(book.title)
                        .font(.custom("CormorantGaramond-SemiBold", size: 10))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Spacer()
                    Text(book.volumeNumber)
                        .font(.system(size: 6.5, weight: .bold, design: .monospaced))
                        .foregroundColor(Color.white.opacity(0.5))
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 7)
                .background(Color(hex: book.colorHex))
                .clipShape(RoundedRectangle(cornerRadius: 5))
                .shadow(color: Color.black.opacity(0.35), radius: 2, y: 1)
            }

            Spacer()
        }
        .padding(12)
        .background(Color(hex: "#121417"))
        .widgetURL(URL(string: "noticed://space/\(s.activeSpaceId)"))
    }
}

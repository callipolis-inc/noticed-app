import { Space, FieldNote } from "@/types";

export const DEMO_SHOWCASE_SPACES: Space[] = [
  {
    id: "space-kyoto",
    name: "Kyoto Field Notes",
    type: "personal",
    description: "Quiet observations & morning tea in the northern temples",
    iconName: "book-open",
    coverStyle: "klein",
    fontChoice: "editorial",
    isShared: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "space-marginalia",
    name: "Literary Marginalia",
    type: "personal",
    description: "Fragments, footnotes & companion reflections on art",
    iconName: "feather",
    coverStyle: "obsidian",
    fontChoice: "editorial",
    isShared: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "space-night",
    name: "Midnight Chronicles",
    type: "personal",
    description: "Acoustic memories, rain sounds & darkroom film folios",
    iconName: "moon",
    coverStyle: "espresso",
    fontChoice: "editorial",
    isShared: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "space-atelier",
    name: "Atelier Folio",
    type: "personal",
    description: "Visual studies, photostrips and archival prints",
    iconName: "compass",
    coverStyle: "linen",
    fontChoice: "editorial",
    isShared: false,
    createdAt: new Date().toISOString(),
  },
];

export const DEMO_SHOWCASE_NOTES: FieldNote[] = [
  {
    id: "note-1",
    spaceId: "space-kyoto",
    title: "Rain Across The Hinoki Cypress",
    content:
      "Morning mist descending upon the northern foothills of Kyoto. The quiet cadence of rain dripping from the cedar eaves provides an intimate sanctuary for slow writing.\n\nWe sat by the stone veranda in complete stillness. Everything here moves with deliberate rhythm, measured not by frantic seconds, but by the quiet accumulation of moments.",
    locationName: "Daitoku-ji, Kyoto",
    pinned: true,
    fontChoice: "editorial",
    textAlign: "left",
    marginalia: "The stone courtyard was arranged in 1502 by tea master Sen no Rikyu.",
    marginaliaItems: [
      {
        id: "fn-1",
        content: "The stone courtyard was arranged in 1502 by tea master Sen no Rikyu.",
        targetSentence: "stone veranda in complete stillness",
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    author: {
      name: "Afa",
    },
  },
  {
    id: "note-2",
    spaceId: "space-kyoto",
    title: "Analog Film Emulsion 1974",
    content:
      "Late afternoon golden hour slanting across antique shoji paper screens. The analog grain gives light an almost physical texture.",
    locationName: "Gion District, Twilight",
    photos: ["/logo-dark-original.png"],
    photosMeta: [
      {
        url: "/logo-dark-original.png",
        filter: "sepia",
        hasGrain: true,
        caption: "Late light in Gion, Autumn 1974",
        frameMode: "polaroid",
      },
    ],
    photostripLayout: "polaroid",
    fontChoice: "editorial",
    textAlign: "left",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    author: {
      name: "Afa",
    },
  },
  {
    id: "note-3",
    spaceId: "space-kyoto",
    title: "Bronze Temple Bell Resonance",
    content:
      "Capturing the deep acoustic decay of the evening bronze bell echoing through the mountain ridge. Sound lingers for nearly forty seconds before fading into valley fog.",
    locationName: "Kiyomizu Ridge",
    voiceMemo: {
      durationSeconds: 42,
      audioUrl: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
    },
    fontChoice: "editorial",
    textAlign: "left",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    author: {
      name: "Afa",
    },
  },
];

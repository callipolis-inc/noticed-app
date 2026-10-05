# Noticed — Archive Directory

Folder ini menyimpan komponen, aset sumber, referensi visual awal, dan skrip sekali pakai yang sudah digantikan oleh arsitektur generasi terbaru (**Noticed v1.0**), namun tetap disimpan sebagai arsip historis.

## Struktur Folder `archive/`

1. **`legacy-components/`**
   - `notes/NoteCard.tsx`: Komponen kartu catatan generasi awal (digantikan oleh [`NoteEntry.tsx`](../src/components/notes/NoteEntry.tsx) dengan margin editorial, inline video player, dan footnote).
   - `notes/PhotosGridView.tsx`: Tampilan grid foto lama (digantikan oleh [`PhotostripModal.tsx`](../src/components/notes/PhotostripModal.tsx) dan galeri inline).
   - `notes/TimelineScrubber.tsx`: Scrubber tanggal lama (digantikan oleh filter tanggal terintegrasi dan [`NotebookIndexSheet.tsx`](../src/components/notes/NotebookIndexSheet.tsx)).
   - `spaces/BookshelfFolio.tsx`, `NotebookCover.tsx`, `SpacePairingSheet.tsx`, `SpaceSwitcher.tsx`: Komponen switcher buku generasi awal (digantikan sepenuhnya oleh rak buku 3D spasial [`BookshelfModal.tsx`](../src/components/spaces/BookshelfModal.tsx) dan [`BookshelfSpine.tsx`](../src/components/spaces/BookshelfSpine.tsx)).
   - `ui/BottomSheet.tsx`: Wrapper bottom sheet generasi awal.
   - `ui/SilkBookmarkRibbon.tsx`: Ornamen pita pembatas halaman eksperimental.

2. **`assets/`**
   - `logo-transparent-dark.png` & `logo-transparent-light.png`: File logo sumber transparan asli sebelum diproses menjadi ikon iOS berlatar *Liquid Glass* (`public/logo-dark.png` dan `public/logo-light.png`).

3. **`references/`**
   - Tangkapan layar referensi eksplorasi desain awal iOS.

4. **`scripts/`**
   - `generate_showcase.cjs`: Skrip pembuat halaman pratinjau perbandingan ikon.

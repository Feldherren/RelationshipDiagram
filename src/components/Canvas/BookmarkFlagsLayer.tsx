import { Layer } from "react-konva";
import { useDiagramStore } from "../../store/diagramStore";
import { BookmarkFlag } from "./BookmarkFlag";
import { BookmarkViewportFrame } from "./BookmarkViewportFrame";
import { BackgroundImageHandle } from "./BackgroundImageHandle";

export function BookmarkFlagsLayer() {
  const bookmarks = useDiagramStore((s) => s.bookmarks);
  const bookmarksVisible = useDiagramStore((s) => s.bookmarksVisible);
  const selection = useDiagramStore((s) => s.selection);
  const backgroundMode = useDiagramStore(
    (s) => s.diagramAppearance.backgroundMode,
  );
  const backgroundImageData = useDiagramStore(
    (s) => s.diagramAppearance.backgroundImageData,
  );

  const showBackgroundHandle =
    bookmarksVisible &&
    backgroundMode === "image" &&
    Boolean(backgroundImageData);

  const selectedId =
    selection?.type === "bookmark" ? selection.id : null;
  const selectedBookmark = selectedId
    ? bookmarks.find((b) => b.id === selectedId)
    : undefined;

  // When flags are hidden, still show the selected bookmark and its extents
  // (e.g. while editing from the list).
  if (!bookmarksVisible && !selectedBookmark && !showBackgroundHandle) {
    return null;
  }

  if (bookmarks.length === 0 && !showBackgroundHandle) return null;

  const visibleBookmarks = bookmarksVisible
    ? bookmarks
    : selectedBookmark
      ? [selectedBookmark]
      : [];

  return (
    <Layer listening>
      {selectedBookmark ? (
        <BookmarkViewportFrame bookmark={selectedBookmark} />
      ) : null}
      {visibleBookmarks.map((bookmark) => (
        <BookmarkFlag
          key={bookmark.id}
          bookmark={bookmark}
          selected={bookmark.id === selectedId}
        />
      ))}
      {showBackgroundHandle ? <BackgroundImageHandle /> : null}
    </Layer>
  );
}

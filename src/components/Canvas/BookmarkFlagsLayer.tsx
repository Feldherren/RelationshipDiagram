import { Layer } from "react-konva";
import { useDiagramStore } from "../../store/diagramStore";
import { BookmarkFlag } from "./BookmarkFlag";
import { BookmarkViewportFrame } from "./BookmarkViewportFrame";

export function BookmarkFlagsLayer() {
  const bookmarks = useDiagramStore((s) => s.bookmarks);
  const bookmarksVisible = useDiagramStore((s) => s.bookmarksVisible);
  const selection = useDiagramStore((s) => s.selection);

  if (!bookmarksVisible || bookmarks.length === 0) return null;

  const selectedId =
    selection?.type === "bookmark" ? selection.id : null;
  const selectedBookmark = selectedId
    ? bookmarks.find((b) => b.id === selectedId)
    : undefined;

  return (
    <Layer listening>
      {selectedBookmark ? (
        <BookmarkViewportFrame bookmark={selectedBookmark} />
      ) : null}
      {bookmarks.map((bookmark) => (
        <BookmarkFlag
          key={bookmark.id}
          bookmark={bookmark}
          selected={bookmark.id === selectedId}
        />
      ))}
    </Layer>
  );
}

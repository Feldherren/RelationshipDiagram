import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { useTranslation } from "react-i18next";
import { rgbToCss, type RGB, type ViewBookmark } from "../../models/types";
import { useDiagramStore } from "../../store/diagramStore";
import { RgbPicker } from "../pickers/RgbPicker";
import { BookmarkIcon, BookmarkAddIcon } from "../icons/BookmarkIcon";
import { EyeOpenIcon, EyeClosedIcon } from "../icons/EyeIcon";
import { randomPastelColor } from "../../utils/pastelPalette";
import {
  resolveSymbolSwatchStyle,
  subscribeUiChrome,
  SYMBOL_SWATCH_ON_LIGHT,
  type SymbolSwatchStyle,
} from "../../utils/symbolSwatchStyle";

interface ContextMenuState {
  bookmarkId: string;
  x: number;
  y: number;
}

let cachedSwatchStyle: SymbolSwatchStyle = SYMBOL_SWATCH_ON_LIGHT;

function getSymbolSwatchStyleSnapshot(): SymbolSwatchStyle {
  const next = resolveSymbolSwatchStyle();
  if (
    next.background === cachedSwatchStyle.background &&
    next.foreground === cachedSwatchStyle.foreground
  ) {
    return cachedSwatchStyle;
  }
  cachedSwatchStyle = next;
  return cachedSwatchStyle;
}

export function ViewportControls() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [editing, setEditing] = useState<ViewBookmark | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState<RGB>(() => randomPastelColor());
  const rootRef = useRef<HTMLDivElement>(null);

  const bookmarks = useDiagramStore((s) => s.bookmarks);
  const bookmarksVisible = useDiagramStore((s) => s.bookmarksVisible);
  const setBookmarksVisible = useDiagramStore((s) => s.setBookmarksVisible);
  const addBookmark = useDiagramStore((s) => s.addBookmark);
  const updateBookmark = useDiagramStore((s) => s.updateBookmark);
  const updateBookmarkView = useDiagramStore((s) => s.updateBookmarkView);
  const deleteBookmark = useDiagramStore((s) => s.deleteBookmark);
  const goToBookmark = useDiagramStore((s) => s.goToBookmark);

  const swatchStyle = useSyncExternalStore(
    subscribeUiChrome,
    getSymbolSwatchStyleSnapshot,
    () => SYMBOL_SWATCH_ON_LIGHT,
  );

  const closeAll = () => {
    setOpen(false);
    setMenu(null);
    setEditing(null);
  };

  // Context menu: dismiss on any click outside the menu itself (including canvas).
  useEffect(() => {
    if (!menu) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        target instanceof Element &&
        target.closest(".bookmark-context-menu")
      ) {
        return;
      }
      setMenu(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menu]);

  // Strip / edit form: keep open while interacting with the canvas.
  useEffect(() => {
    if (!open && !editing) return;
    if (menu) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        (target.closest(".canvas-container") ||
          target.closest(".selection-float") ||
          target.closest(".fit-to-content-button"))
      ) {
        return;
      }
      closeAll();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editing) {
        setEditing(null);
        return;
      }
      setOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, menu, editing]);

  const handleAdd = () => {
    addBookmark();
    setMenu(null);
    setEditing(null);
  };

  const openEditForm = (bookmark: ViewBookmark) => {
    setDraftName(bookmark.name);
    setDraftColor({ ...bookmark.color });
    setEditing(bookmark);
    setMenu(null);
  };

  const submitEdit = () => {
    if (!editing) return;
    const name = draftName.trim();
    updateBookmark(editing.id, {
      name: name || editing.name,
      color: draftColor,
    });
    setEditing(null);
  };

  const swatchVars = {
    "--symbol-swatch-bg": swatchStyle.background,
    "--symbol-swatch-fg": swatchStyle.foreground,
  } as CSSProperties;

  const menuBookmark = menu
    ? bookmarks.find((b) => b.id === menu.bookmarkId) ?? null
    : null;

  return (
    <div className="viewport-controls-anchor" ref={rootRef}>
      <div className="viewport-controls-row">
        <button
          type="button"
          className={
            open
              ? "viewport-control-button bookmark-toggle active"
              : "viewport-control-button bookmark-toggle"
          }
          style={open ? undefined : swatchVars}
          title={t("bookmarks.title")}
          aria-label={t("bookmarks.title")}
          aria-pressed={open}
          aria-expanded={open}
          onClick={() => {
            setOpen((value) => !value);
            setMenu(null);
            setEditing(null);
          }}
        >
          <BookmarkIcon className="viewport-control-icon" size={22} />
        </button>
        <button
          type="button"
          className={
            bookmarksVisible
              ? "viewport-control-button active"
              : "viewport-control-button"
          }
          title={
            bookmarksVisible
              ? t("bookmarks.hideFlags")
              : t("bookmarks.showFlags")
          }
          aria-label={
            bookmarksVisible
              ? t("bookmarks.hideFlags")
              : t("bookmarks.showFlags")
          }
          aria-pressed={bookmarksVisible}
          onClick={() => setBookmarksVisible(!bookmarksVisible)}
        >
          {bookmarksVisible ? (
            <EyeOpenIcon className="viewport-control-icon" size={22} />
          ) : (
            <EyeClosedIcon className="viewport-control-icon" size={22} />
          )}
        </button>
      </div>

      {open && (
        <div className="bookmarks-strip" role="menu" style={swatchVars}>
          {bookmarks.map((bookmark) => (
            <div key={bookmark.id} className="bookmark-strip-row">
              <button
                type="button"
                className="bookmark-strip-item"
                style={{ color: rgbToCss(bookmark.color) }}
                aria-label={t("bookmarks.goAria", { name: bookmark.name })}
                onClick={() => goToBookmark(bookmark.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setEditing(null);
                  setMenu({
                    bookmarkId: bookmark.id,
                    x: e.clientX,
                    y: e.clientY,
                  });
                }}
              >
                <BookmarkIcon className="bookmark-strip-icon" size={20} />
              </button>
              <span className="bookmark-strip-label" aria-hidden>
                {bookmark.name}
              </span>
            </div>
          ))}
          <button
            type="button"
            className="bookmark-strip-add"
            title={t("bookmarks.add")}
            aria-label={t("bookmarks.add")}
            onClick={handleAdd}
          >
            <BookmarkAddIcon className="viewport-control-icon" size={20} />
          </button>
        </div>
      )}

      {menu && menuBookmark && (
        <div
          className="bookmark-context-menu"
          role="menu"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => openEditForm(menuBookmark)}
          >
            {t("bookmarks.edit")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              updateBookmarkView(menuBookmark.id);
              setMenu(null);
            }}
          >
            {t("bookmarks.updateView")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="bookmark-context-menu-delete"
            onClick={() => {
              deleteBookmark(menuBookmark.id);
              setMenu(null);
            }}
          >
            {t("bookmarks.delete")}
          </button>
        </div>
      )}

      {editing && (
        <div
          className="bookmarks-popup bookmarks-edit-popup"
          role="dialog"
          aria-label={t("bookmarks.editTitle")}
        >
          <div className="bookmarks-form">
            <h3>{t("bookmarks.editTitle")}</h3>
            <label className="field">
              <span>{t("bookmarks.nameLabel")}</span>
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                maxLength={80}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitEdit();
                  }
                }}
              />
            </label>
            <RgbPicker
              label={t("bookmarks.colourLabel")}
              value={draftColor}
              onChange={setDraftColor}
            />
            <div className="bookmarks-form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditing(null)}
              >
                {t("bookmarks.cancel")}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={submitEdit}
              >
                {t("bookmarks.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

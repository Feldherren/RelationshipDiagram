import { useEffect, useRef, useState, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../../store/diagramStore";
import { EyeOpenIcon, EyeClosedIcon } from "../icons/EyeIcon";
import { LayerAddIcon, LayersIcon } from "../icons/LayersIcon";

export function LayerControls() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [dragDisplayIndex, setDragDisplayIndex] = useState<number | null>(
    null,
  );
  /** Insertion slot in display order: 0 = before first, length = after last. */
  const [dropInsertIndex, setDropInsertIndex] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const layers = useDiagramStore((s) => s.layers);
  const activeLayerId = useDiagramStore((s) => s.activeLayerId);
  const addLayer = useDiagramStore((s) => s.addLayer);
  const renameLayer = useDiagramStore((s) => s.renameLayer);
  const setLayerVisible = useDiagramStore((s) => s.setLayerVisible);
  const reorderLayers = useDiagramStore((s) => s.reorderLayers);
  const setActiveLayer = useDiagramStore((s) => s.setActiveLayer);
  const deleteLayer = useDiagramStore((s) => s.deleteLayer);

  // UI lists top (front) first; storage is back → front.
  const displayLayers = [...layers].reverse();
  const activeLayer = layers.find((l) => l.id === activeLayerId);

  useEffect(() => {
    if (!open) return;

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
      setOpen(false);
      setEditingId(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setEditingId(null);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!editingId) return;
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [editingId]);

  const commitRename = () => {
    if (!editingId) return;
    renameLayer(editingId, editName);
    setEditingId(null);
  };

  const storageIndexFromDisplay = (displayIndex: number) =>
    layers.length - 1 - displayIndex;

  const clearDragState = () => {
    setDragDisplayIndex(null);
    setDropInsertIndex(null);
  };

  const updateDropInsertFromRow = (
    e: DragEvent<HTMLElement>,
    displayIndex: number,
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const insert =
      e.clientY < rect.top + rect.height / 2
        ? displayIndex
        : displayIndex + 1;
    setDropInsertIndex(insert);
  };

  const handleDropAtInsert = (insertIndex: number | null) => {
    if (dragDisplayIndex == null || insertIndex == null) {
      clearDragState();
      return;
    }
    // No-op if dropping in the same place (before or after itself).
    if (
      insertIndex === dragDisplayIndex ||
      insertIndex === dragDisplayIndex + 1
    ) {
      clearDragState();
      return;
    }
    const targetDisplay =
      dragDisplayIndex < insertIndex ? insertIndex - 1 : insertIndex;
    const from = storageIndexFromDisplay(dragDisplayIndex);
    const to = storageIndexFromDisplay(targetDisplay);
    reorderLayers(from, to);
    clearDragState();
  };

  const showDropLine =
    dragDisplayIndex != null &&
    dropInsertIndex != null &&
    dropInsertIndex !== dragDisplayIndex &&
    dropInsertIndex !== dragDisplayIndex + 1;

  return (
    <div className="layer-controls-anchor" ref={rootRef}>
      <div className="layer-controls-row">
        <button
          type="button"
          className={
            open
              ? "viewport-control-button layer-toggle active"
              : "viewport-control-button layer-toggle"
          }
          title={t("layers.title")}
          aria-label={t("layers.title")}
          aria-pressed={open}
          aria-expanded={open}
          onClick={() => {
            setOpen((value) => !value);
            setEditingId(null);
          }}
        >
          <LayersIcon className="viewport-control-icon" size={22} />
        </button>
      </div>

      {open && (
        <div
          className="layers-strip"
          role="menu"
          onDragOver={(e) => {
            if (dragDisplayIndex == null) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDropAtInsert(dropInsertIndex);
          }}
          onDragLeave={(e) => {
            if (
              e.currentTarget.contains(e.relatedTarget as Node | null)
            ) {
              return;
            }
            setDropInsertIndex(null);
          }}
        >
          <div className="layer-strip-actions">
            <button
              type="button"
              className="layer-strip-add"
              title={t("layers.add")}
              aria-label={t("layers.add")}
              onClick={() => addLayer()}
              onDragOver={(e) => {
                if (dragDisplayIndex == null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDropInsertIndex(0);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDropAtInsert(0);
              }}
            >
              <LayerAddIcon className="viewport-control-icon" size={20} />
            </button>
            <button
              type="button"
              className="layer-strip-delete"
              title={
                layers.length <= 1
                  ? t("layers.deleteLastBlocked")
                  : t("layers.delete")
              }
              aria-label={
                activeLayer
                  ? t("layers.deleteAria", { name: activeLayer.name })
                  : t("layers.delete")
              }
              disabled={layers.length <= 1 || !activeLayerId}
              onClick={() => {
                if (!activeLayerId) return;
                void deleteLayer(activeLayerId);
              }}
            >
              ×
            </button>
          </div>
          {displayLayers.map((layer, displayIndex) => {
            const active = layer.id === activeLayerId;
            const isEditing = editingId === layer.id;
            const isDragging = dragDisplayIndex === displayIndex;
            const lineBefore =
              showDropLine && dropInsertIndex === displayIndex;

            return (
              <div key={layer.id} className="layer-strip-slot">
                {lineBefore && (
                  <div className="layer-drop-line" aria-hidden />
                )}
                <div
                  className={
                    isDragging
                      ? "layer-strip-row is-dragging"
                      : "layer-strip-row"
                  }
                  draggable={!isEditing}
                  onDragStart={(e) => {
                    setDragDisplayIndex(displayIndex);
                    setDropInsertIndex(null);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", layer.id);
                  }}
                  onDragEnd={clearDragState}
                  onDragOver={(e) => updateDropInsertFromRow(e, displayIndex)}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const insert =
                      e.clientY < rect.top + rect.height / 2
                        ? displayIndex
                        : displayIndex + 1;
                    handleDropAtInsert(insert);
                  }}
                >
                  <span
                    className="layer-strip-drag"
                    title={t("layers.reorder")}
                    aria-hidden
                  >
                    ⋮⋮
                  </span>
                  {isEditing ? (
                    <input
                      ref={renameInputRef}
                      className="layer-strip-rename"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitRename();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setEditingId(null);
                        }
                      }}
                      aria-label={t("layers.renameAria")}
                    />
                  ) : (
                    <button
                      type="button"
                      className={
                        active
                          ? "layer-strip-item active"
                          : "layer-strip-item"
                      }
                      title={t("layers.selectAria", { name: layer.name })}
                      aria-label={t("layers.selectAria", {
                        name: layer.name,
                      })}
                      aria-pressed={active}
                      onClick={() => setActiveLayer(layer.id)}
                      onDoubleClick={() => {
                        setEditingId(layer.id);
                        setEditName(layer.name);
                      }}
                    >
                      <span className="layer-strip-name">{layer.name}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className={
                      layer.visible
                        ? "viewport-control-button layer-row-button active"
                        : "viewport-control-button layer-row-button"
                    }
                    title={
                      layer.visible ? t("layers.hide") : t("layers.show")
                    }
                    aria-label={
                      layer.visible ? t("layers.hide") : t("layers.show")
                    }
                    aria-pressed={layer.visible}
                    onClick={() =>
                      setLayerVisible(layer.id, !layer.visible)
                    }
                  >
                    {layer.visible ? (
                      <EyeOpenIcon
                        className="viewport-control-icon"
                        size={16}
                      />
                    ) : (
                      <EyeClosedIcon
                        className="viewport-control-icon"
                        size={16}
                      />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
          {showDropLine && dropInsertIndex === displayLayers.length && (
            <div className="layer-drop-line" aria-hidden />
          )}
        </div>
      )}
    </div>
  );
}

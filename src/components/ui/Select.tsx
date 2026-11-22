"use client";

import {
  Children,
  isValidElement,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { Field } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/** Lo que recibe `onChange`: la misma forma que el evento de un `<select>` (`event.target.value`). */
export interface SelectChangeEvent {
  target: { value: string; name?: string };
}

export interface SelectProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
  /** Opciones; si prefieres, pasa los `<option>` como children. */
  options?: SelectOption[];
  /** Texto de la opcion vacia inicial (valor ""). */
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: SelectChangeEvent) => void;
  /** Con `name` se envia en los formularios (input oculto). */
  name?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  /** Clases del boton (alto, ancho, texto). */
  className?: string;
  title?: string;
  children?: ReactNode;
  "aria-label"?: string;
}

/** Con mas opciones que esto, la lista lleva buscador. */
const SEARCH_FROM = 9;
const LIST_MAX_HEIGHT = 288;
const GAP = 4;

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Texto plano de los children de un `<option>`. */
function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

function optionsFromChildren(children: ReactNode): SelectOption[] {
  const list: SelectOption[] = [];
  Children.toArray(children).forEach((child) => {
    if (
      !isValidElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>(child)
    )
      return;
    if (child.type !== "option") return;
    const text = textOf(child.props.children);
    list.push({
      value: child.props.value == null ? text : String(child.props.value),
      label: text,
      disabled: child.props.disabled,
    });
  });
  return list;
}

type Placement = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

/**
 * Clases base del boton que se quitan si `className` trae otra del mismo grupo (aqui no hay
 * tailwind-merge y, en CSS, `w-full` le ganaba a `w-36`).
 */
const OVERRIDABLE: Array<[RegExp, string[]]> = [
  [/(^|\s)(min-|max-)?w-/, ["w-full"]],
  [/(^|\s)h-/, ["h-9"]],
  [/(^|\s)px-/, ["px-3"]],
  [/(^|\s)text-(xs|sm|base|lg)(\s|$)/, ["text-base", "sm:text-sm"]],
];

function baseClasses(className: string | undefined): string {
  const drop = new Set(
    OVERRIDABLE.filter(([re]) => re.test(className ?? "")).flatMap(([, classes]) => classes),
  );
  return ["w-full", "h-9", "px-3", "text-base", "sm:text-sm"].filter((c) => !drop.has(c)).join(" ");
}

/**
 * Desplegable propio (el `<select>` nativo pinta su lista con el estilo del sistema): boton con el
 * aspecto de los campos y una lista flotante con el diseño del panel. Teclado completo (flechas,
 * Inicio/Fin, Enter, Escape, letra inicial), buscador cuando hay muchas opciones y la lista en un
 * portal con `position: fixed` (no la recortan las tablas con scroll ni los modales). Misma API que
 * antes: `options` o `<option>` como children, `placeholder`, `value`/`onChange(event.target.value)`.
 */
export function Select({
  label,
  hint,
  error,
  wrapperClassName,
  options,
  placeholder,
  value,
  defaultValue,
  onChange,
  name,
  id,
  disabled,
  required,
  className,
  title,
  children,
  "aria-label": ariaLabel,
}: SelectProps) {
  const autoId = useId();
  const triggerId = id ?? name ?? autoId;
  const listId = `${triggerId}-list`;

  const items = useMemo<SelectOption[]>(() => {
    const base = [...(options ?? []), ...optionsFromChildren(children)];
    return placeholder !== undefined ? [{ value: "", label: placeholder }, ...base] : base;
  }, [options, children, placeholder]);

  const [inner, setInner] = useState(defaultValue ?? "");
  const current = value ?? inner;
  const selected = items.find((item) => item.value === current);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<Placement | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const searchable = items.length >= SEARCH_FROM;
  const visible = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return items;
    return items.filter((item) => normalize(item.label).includes(needle));
  }, [items, query]);
  // Con el filtro la lista encoge: la activa nunca pasa de la ultima.
  const cursor = Math.min(active, Math.max(visible.length - 1, 0));

  const place_ = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - GAP - 8;
    const above = rect.top - GAP - 8;
    const width = Math.max(rect.width, 180);
    const left = Math.min(rect.left, window.innerWidth - width - 8);
    if (below >= Math.min(LIST_MAX_HEIGHT, 200) || below >= above) {
      setPlace({
        left,
        width,
        top: rect.bottom + GAP,
        maxHeight: Math.min(LIST_MAX_HEIGHT, below),
      });
    } else {
      setPlace({
        left,
        width,
        bottom: window.innerHeight - rect.top + GAP,
        maxHeight: Math.min(LIST_MAX_HEIGHT, above),
      });
    }
  }, []);

  function close(focusTrigger: boolean) {
    setOpen(false);
    setQuery("");
    // Por id y no por ref: `close` se llama desde la lista del portal.
    if (focusTrigger) document.getElementById(triggerId)?.focus();
  }

  function openList() {
    if (disabled) return;
    const index = items.findIndex((item) => item.value === current);
    setActive(index >= 0 ? index : 0);
    setQuery("");
    place_();
    setOpen(true);
  }

  function choose(option: SelectOption | undefined) {
    if (!option || option.disabled) return;
    if (value === undefined) setInner(option.value);
    if (option.value !== current) onChange?.({ target: { value: option.value, name } });
    close(true);
  }

  // Recolocar con scroll y resize; cerrar al pulsar fuera.
  useLayoutEffect(() => {
    if (!open) return;
    place_();
    const onMove = () => place_();
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open, place_]);

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  // La opcion activa siempre a la vista.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [cursor, open]);

  function move(step: number) {
    if (visible.length === 0) return;
    let next = cursor;
    for (let i = 0; i < visible.length; i++) {
      next = (next + step + visible.length) % visible.length;
      if (!visible[next]?.disabled) break;
    }
    setActive(next);
  }

  /** Letra inicial (sin buscador): salta a la siguiente opcion que empiece asi. */
  function typeAhead(key: string) {
    const now = Date.now();
    typed.current.text = now - typed.current.at > 600 ? key : typed.current.text + key;
    typed.current.at = now;
    const needle = normalize(typed.current.text);
    const start = typed.current.text.length === 1 ? cursor + 1 : cursor;
    for (let i = 0; i < visible.length; i++) {
      const index = (start + i) % visible.length;
      const item = visible[index];
      if (item && !item.disabled && normalize(item.label).startsWith(needle)) {
        setActive(index);
        return;
      }
    }
  }

  function onListKey(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Home":
        if (searchable) return;
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        if (searchable) return;
        event.preventDefault();
        setActive(visible.length - 1);
        break;
      case "Enter":
        event.preventDefault();
        choose(visible[cursor]);
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
      default:
        if (!searchable && event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
          typeAhead(event.key);
        }
    }
  }

  function onTriggerKey(event: KeyboardEvent) {
    if (open) {
      onListKey(event);
      return;
    }
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openList();
    }
  }

  const activeId = open && visible[cursor] ? `${listId}-${cursor}` : undefined;
  const showsPlaceholder = !selected || (placeholder !== undefined && current === "");

  const trigger = (
    <button
      ref={triggerRef}
      id={triggerId}
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-activedescendant={searchable ? undefined : activeId}
      aria-label={ariaLabel}
      aria-invalid={error ? true : undefined}
      aria-required={required || undefined}
      title={title}
      disabled={disabled}
      onClick={() => (open ? close(false) : openList())}
      onKeyDown={onTriggerKey}
      className={cn(
        baseClasses(className),
        "border-line bg-paper text-ink flex items-center gap-2 rounded-md border text-left shadow-xs transition-[border-color,box-shadow] duration-150",
        "hover:border-line-strong focus-visible:border-accent focus-visible:ring-accent/15 focus-visible:ring-3 focus-visible:outline-none",
        "disabled:bg-subtle cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
        open && "border-accent ring-accent/15 ring-3",
        error && "border-error",
        className,
      )}
    >
      <span className={cn("min-w-0 flex-1 truncate", showsPlaceholder && "text-ink/45")}>
        {selected?.label ?? placeholder ?? ""}
      </span>
      <svg
        viewBox="0 0 16 16"
        aria-hidden
        className={cn(
          "text-ink/45 size-4 shrink-0 transition-transform duration-150",
          open && "rotate-180",
        )}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m4 6 4 4 4-4" />
      </svg>
    </button>
  );

  const popover =
    open && place
      ? createPortal(
          <div
            ref={popRef}
            // Los eventos de un portal suben por el arbol de React: que un clic aqui no llegue a
            // una fila clicable de detras.
            onClick={(event) => event.stopPropagation()}
            className="border-line bg-paper animate-pop fixed z-[70] flex flex-col overflow-hidden rounded-lg border shadow-lg"
            style={{
              left: place.left,
              width: place.width,
              top: place.top,
              bottom: place.bottom,
              maxHeight: place.maxHeight,
            }}
          >
            {searchable ? (
              <div className="border-line border-b p-1.5">
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onListKey}
                  placeholder="Buscar…"
                  aria-label="Buscar opción"
                  aria-controls={listId}
                  aria-activedescendant={activeId}
                  className="bg-subtle placeholder:text-ink/40 h-8 w-full rounded-md px-2.5 text-sm outline-none"
                />
              </div>
            ) : null}
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-labelledby={triggerId}
              className="min-h-0 flex-1 overflow-y-auto p-1"
            >
              {visible.length === 0 ? (
                <li className="text-ink/50 px-2.5 py-2 text-sm">Sin resultados</li>
              ) : (
                visible.map((item, index) => {
                  const isSelected = item.value === current;
                  return (
                    <li
                      key={`${item.value}-${index}`}
                      id={`${listId}-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={item.disabled || undefined}
                      onPointerMove={() => !item.disabled && setActive(index)}
                      onClick={() => choose(item)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm select-none",
                        index === cursor && "bg-subtle",
                        isSelected && "text-accent font-medium",
                        item.value === "" &&
                          placeholder !== undefined &&
                          !isSelected &&
                          "text-ink/55",
                        item.disabled && "cursor-not-allowed opacity-40",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {isSelected ? (
                        <svg
                          viewBox="0 0 16 16"
                          aria-hidden
                          className="size-4 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m3.5 8.5 3 3 6-7" />
                        </svg>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  const control = (
    <>
      {trigger}
      {name ? <input type="hidden" name={name} value={current} /> : null}
      {popover}
    </>
  );

  if (!label && !hint && !error) {
    return wrapperClassName ? <div className={wrapperClassName}>{control}</div> : control;
  }

  return (
    <Field label={label} hint={hint} error={error} htmlFor={triggerId} className={wrapperClassName}>
      {control}
    </Field>
  );
}

import { useState, useRef, useEffect } from 'react';
import { searchPlayers } from '../utils/apiClient.js';

/**
 * Autocomplete input with dropdown suggestions.
 * Props:
 *   value        — current input value
 *   onChange     — (newValue: string) => void
 *   onSelect     — (item: object) => void — called when user picks a suggestion (receives the full item)
 *   placeholder  — input placeholder text
 *   token        — auth token for API calls
 *   style        — optional inline style for the container
 *   searchFn     — (query: string) => Promise<Array> — custom search; defaults to searchPlayers
 *   disabled     — disable the input
 */
export default function AutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder,
  token,
  style,
  searchFn,
  disabled,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  const doSearch = searchFn || ((q) => searchPlayers(q, token));

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function handleChange(e) {
    const v = e.target.value;
    onChange(v);
    setHighlightIdx(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length === 0) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const list = await doSearch(v.trim());
        setSuggestions(list);
        setShowDropdown(list.length > 0);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 200);
  }

  function selectItem(item) {
    const name = item.display_name || item.name;
    onChange(name);
    if (onSelect) onSelect(item);
    setSuggestions([]);
    setShowDropdown(false);
    setHighlightIdx(-1);
  }

  function handleKeyDown(e) {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      selectItem(suggestions[highlightIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }

  function getDisplayName(item) {
    return item.display_name || item.name || '';
  }

  return (
    <div ref={containerRef} className="autocomplete-container" style={style}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
      />
      {showDropdown && suggestions.length > 0 && (
        <ul className="autocomplete-dropdown">
          {suggestions.map((item, i) => (
            <li
              key={getDisplayName(item)}
              className={i === highlightIdx ? 'highlighted' : ''}
              onMouseDown={(e) => { e.preventDefault(); selectItem(item); }}
              onMouseEnter={() => setHighlightIdx(i)}
            >
              <span className="ac-name">{getDisplayName(item)}</span>
              {item.tournament_count > 0 && (
                <span className="ac-meta">{item.tournament_count} турн.</span>
              )}
              {item.players && item.players.length > 0 && (
                <span className="ac-meta">{item.players.join(' / ')}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

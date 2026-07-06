import { useState, useRef, useEffect } from 'react';
import { searchPlayers } from '../utils/apiClient.js';

/**
 * Autocomplete input with dropdown suggestions from /api/players.
 * Props:
 *   value       — current input value
 *   onChange    — (newValue: string) => void
 *   placeholder — input placeholder text
 *   token       — auth token for API calls
 *   style       — optional inline style for the container
 */
export default function AutocompleteInput({ value, onChange, placeholder, token, style }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

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
        const list = await searchPlayers(v.trim(), token);
        setSuggestions(list);
        setShowDropdown(list.length > 0);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 200);
  }

  function selectName(name) {
    onChange(name);
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
      selectName(suggestions[highlightIdx].display_name);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
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
      />
      {showDropdown && suggestions.length > 0 && (
        <ul className="autocomplete-dropdown">
          {suggestions.map((p, i) => (
            <li
              key={p.display_name}
              className={i === highlightIdx ? 'highlighted' : ''}
              onMouseDown={(e) => { e.preventDefault(); selectName(p.display_name); }}
              onMouseEnter={() => setHighlightIdx(i)}
            >
              <span className="ac-name">{p.display_name}</span>
              {p.tournament_count > 0 && (
                <span className="ac-meta">{p.tournament_count} турн.</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

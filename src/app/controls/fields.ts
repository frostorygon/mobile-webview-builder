import { html, nothing, type TemplateResult } from 'lit';
import { icon } from '../../core/icons.js';
import type { Props, PropValue } from '../../core/model.js';
import { humanize, propLabel, type PropDef } from '../../core/registry.js';
import './wb-icon-picker.js';

/** Renders the editor control for one prop. `onChange` receives the new value. */
export function field(p: PropDef, props: Props, onChange: (v: PropValue) => void, extra?: { overridden?: boolean; onReset?: () => void }): TemplateResult {
  const value = props[p.name] ?? p.default ?? (p.type === 'boolean' ? false : '');
  const label = html`<span class="f-label" title=${p.description ?? ''}>
    ${propLabel(p)}${extra?.overridden ? html`<button class="ov" title="Overridden for this instance. Click to reset to the block's value." @click=${extra.onReset}>●</button>` : nothing}
  </span>`;

  switch (p.type) {
    case 'boolean':
      return html`<label class="f f-inline">
        ${label}
        <span class="switch ${value ? 'on' : ''}">
          <input type="checkbox" .checked=${Boolean(value)} @change=${(e: Event) => onChange((e.target as HTMLInputElement).checked)} />
        </span>
      </label>`;
    case 'textarea':
      return html`<div class="f">
        ${label}
        <textarea rows="3" .value=${String(value)} placeholder=${p.placeholder ?? ''} @input=${(e: Event) => onChange((e.target as HTMLTextAreaElement).value)}></textarea>
      </div>`;
    case 'number':
      return html`<div class="f f-inline">
        ${label}
        <input type="number" class="num" .value=${String(value)} @input=${(e: Event) => {
          const v = (e.target as HTMLInputElement).value;
          if (v !== '' && Number.isFinite(Number(v))) onChange(Number(v));
        }} />
      </div>`;
    case 'icon':
      return html`<div class="f f-inline">
        ${label}
        <wb-icon-picker .value=${String(value ?? '')} @change=${(e: CustomEvent) => onChange(e.detail)}></wb-icon-picker>
      </div>`;
    case 'color':
      return html`<div class="f f-inline">
        ${label}
        <span class="color"><input type="color" .value=${String(value)} @input=${(e: Event) => onChange((e.target as HTMLInputElement).value)} /><code>${value}</code></span>
      </div>`;
    case 'space':
      return seg(label, ['none', 'xs', 's', 'm', 'l', 'xl'].map((v) => ({ value: v, label: v === 'none' ? '0' : v.toUpperCase() })), String(value), onChange);
    case 'select': {
      const options = p.options ?? [];
      const short = options.length <= 4 && options.reduce((n, o) => n + (o.label ?? o.value).length, 0) <= 26;
      if (short || options.every((o) => o.icon)) {
        return seg(label, options.map((o) => ({ value: o.value, label: o.label ?? optionLabel(o.value), icon: o.icon })), String(value), onChange);
      }
      return html`<div class="f f-inline">
        ${label}
        <select @change=${(e: Event) => onChange((e.target as HTMLSelectElement).value)}>
          ${options.map((o) => html`<option value=${o.value} ?selected=${o.value === String(value)}>${o.label ?? optionLabel(o.value)}</option>`)}
        </select>
      </div>`;
    }
    default:
      return html`<div class="f">
        ${label}
        <input type="text" .value=${String(value ?? '')} placeholder=${p.placeholder ?? ''} @input=${(e: Event) => onChange((e.target as HTMLInputElement).value)} />
      </div>`;
  }
}

function seg(label: TemplateResult, options: { value: string; label: string; icon?: string }[], value: string, onChange: (v: PropValue) => void) {
  return html`<div class="f">
    ${label}
    <div class="seg">
      ${options.map(
        (o) => html`<button class=${o.value === value ? 'on' : ''} title=${o.label} @click=${() => onChange(o.value)}>
          ${o.icon ? icon(o.icon, 14) : o.label}
        </button>`,
      )}
    </div>
  </div>`;
}

/** Size tokens read best in capitals (XS, M, XL); everything else is humanized. */
function optionLabel(value: string): string {
  return /^(x*[sml]|xxl)$/.test(value) ? value.toUpperCase() : humanize(value);
}

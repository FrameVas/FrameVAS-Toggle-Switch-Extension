# FrameVAS - Toggle Switch for Boolean Fields

![EspoCRM 9.0+](https://img.shields.io/badge/EspoCRM-9.0%2B-2f6bb3)
![PHP 8.3+](https://img.shields.io/badge/PHP-8.3%2B-777bb4)
![Languages](https://img.shields.io/badge/languages-English%20%7C%20Ukrainian-4c9a2a)

**English** | [Українська](README.uk.md)

An EspoCRM extension that turns Boolean fields into clear ON/OFF toggle switches, with your own text, icons and EspoCRM's standard colors, plus optional one-click saving right from record pages and list views.

---

## Why use it

Small checkboxes are easy to miss. When a team works with many on/off settings, approvals or status flags, a toggle switch shows the current state at a glance and reduces mistakes during data entry. This extension changes only how Boolean fields look and behave in the interface. The stored values and the meaning of your fields stay exactly the same.

## Features

- **Toggle switch display** for any Boolean field, turned on per field in Field Manager.
- **Custom text** for the YES and NO states, for example *Approved / Not Approved*, *Active / Disabled* or *ON / OFF*.
- **Icons** for the YES and NO states, picked from EspoCRM's own icon library with search. Show an icon with text or the icon alone.
- **EspoCRM's standard colors**: Default, Success, Danger, Warning, Info and Primary, chosen from the same color menu EspoCRM uses for dropdown options. Colors follow the user's theme, including the Dark theme.
- **Three sizes**: Small, Medium and Large.
- **Fast Inline Edit (Save on Click)**: one click on the switch saves the value immediately, on the record page and directly in list views.
- **Live preview** in Field Manager that updates while you change the settings.
- **Works with EspoCRM's access rules**: role permissions, field-level permissions, read-only fields, dynamic logic and *Duplicate check on update* are all respected.
- **Keyboard and screen reader friendly**: the switch is a real checkbox with the `switch` role, so it can be focused and toggled with the Space key.
- **English and Ukrainian** interface included.
- **No database changes** and no server-side code. Uninstalling returns all fields to standard checkboxes.

## Requirements

- EspoCRM 9.0 or newer (tested on EspoCRM 10)
- PHP 8.3 or newer

## Installation

1. Download the latest extension package (`.zip`) from the [Releases](../../releases) page.
2. In EspoCRM, go to **Administration → Extensions**.
3. Click **Upload**, choose the downloaded file and click **Install**.
4. Go to **Administration → Clear Cache**.
5. Reload the page in your browser.

The extension adds only frontend code, translations and metadata. It doesn't change the database and has no PHP classes.

### Upgrading

Install the new version the same way. Your field settings are kept.

## Configuration

Open **Administration → Entity Manager → (your entity) → Fields** and click a field of type **Boolean**. The extension adds the following settings:

| Setting | What it does | Default |
|---|---|---|
| **Display as Toggle Switch** | Shows the field as a toggle switch instead of a checkbox. When it's off, the field stays a standard checkbox. | Off |
| **Fast Inline Edit (Save on Click)** | A click on the switch saves the value right away, on the record page and in list views. | Off |
| **Toggle: Size** | Small, Medium or Large. | Medium |
| **Toggle: YES Text** | Text inside the switch when the value is YES. | "Yes" in the user's language |
| **Toggle: YES Icon** | Icon shown before the YES text. Pick it from EspoCRM's icon library; **None** removes it. | No icon |
| **Toggle: YES Color** | One of EspoCRM's standard colors. | Success |
| **Toggle: NO Text** | Text inside the switch when the value is NO. | "No" in the user's language |
| **Toggle: NO Icon** | Icon shown before the NO text. | No icon |
| **Toggle: NO Color** | One of EspoCRM's standard colors. | Default |
| **Toggle: Preview** | Live preview of both states with the current settings. Nothing is saved from here. | |

Click **Save**. The new look applies to everyone right away.

> To place the field on pages and lists, use **Administration → Layout Manager** as usual. On some entities (for example Accounts), a new field also has to be added to the **Search Filters** and **Mass Update** layouts before it appears there.

## How it works

### Where the switch appears

| Place | Behavior |
|---|---|
| Record page | The switch shows the current value. With Fast Inline Edit on, a click saves it. With Fast Inline Edit off, use EspoCRM's pencil icon to edit as usual. |
| Edit form, inline edit, mass update | The switch works like a form input. Nothing is saved until you click **Save**. |
| List views | Compact switches. With Fast Inline Edit on, a click saves that row. With it off, the switch is display-only, because EspoCRM list views have no inline editing of their own. |
| Search filters | Unchanged. The standard Yes/No filter is kept. |
| Fields without the setting | Unchanged standard checkboxes. |

The Large size is shown as Medium in list views to keep rows compact.

### Fast Inline Edit (Save on Click)

A switch can be clicked only when all of these are true; otherwise it's shown locked:

- the user may edit the record (role permissions);
- the user may edit this field (field-level permissions);
- the field isn't read-only, read-only after create, or read-only by dynamic logic;
- **Disable Inline Edit** isn't checked for the field.

When the pencil icon is no longer needed, it's hidden for that field.

The server always has the final word, so nothing can be changed without permission:

- **Permissions in lists.** EspoCRM list views load only the visible columns. For roles with *team* access, entities with *Multiple Assigned Users*, and *Collaborators*, the browser can't always tell in advance whether a row may be edited. In those cases the switch is clickable and the server decides. If it refuses, the switch flips back and EspoCRM shows **Access denied**.
- **Duplicate check on update.** If the entity has this option turned on and the record has possible duplicates, a click shows EspoCRM's own *"The record you are creating might already exist"* dialog, exactly like saving from the record page. **Save** stores the new value; **Cancel** or closing the dialog flips the switch back.
- **Any other error.** The switch flips back and EspoCRM's standard error message is shown.

Changes made with a click are saved like any other edit. They appear in the stream if the field is **Audited**.

### Text, icons and languages

- **Empty text** shows "Yes" / "No" in each user's language. If an icon is selected and the text is empty, only the icon is shown.
- **Common words are translated automatically.** If you type one of these words, users see it in their own language: Yes, No, On, Off, ON, OFF, YES, NO, Active, Inactive, Enabled, Disabled, Approved, Not Approved. Words that already exist as labels of the entity or as global EspoCRM labels are translated too. Any other text is shown exactly as typed.
- **The switch keeps the same width** in both states, so lists don't shift when values change.

### Colors

The six colors are EspoCRM's standard styles: **Default** (grey), **Success** (green), **Danger** (red), **Warning** (orange), **Info** and **Primary**. They come from the active theme, so the switch matches every EspoCRM theme, including Dark.

## Compatibility notes

- The extension sets the default view for Boolean fields. Fields that already use their own custom view in metadata keep that view.
- If another extension also replaces the default Boolean view, the one with the higher module order wins. This extension uses order 30.

## Uninstalling

Go to **Administration → Extensions** and uninstall the extension. All Boolean fields return to standard checkboxes, and field values aren't touched. The toggle settings stay in the field definitions, unused, so reinstalling brings your configuration back.

## Translations

English and Ukrainian are included. To add a language, copy `custom/Espo/Modules/ToggleSwitch/Resources/i18n/en_US` to a folder with the EspoCRM language code (e.g. `de_DE`), translate the values (keep keys and placeholders like `{user}` unchanged) and clear the cache.

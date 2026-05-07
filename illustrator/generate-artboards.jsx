/* 
 * Author - J. Davis 
 * 0xjdavis@gmail.com
 *
 * GenerateArtboards.jsx
 * Illustrator ExtendScript — Generate blank artboards from
 * common design dimension sizes (social, print, billboard, digital ads)
 *
 * Styled to match Firefly UXP Plugin dark theme (style guide v1)
 * ============================================================

 * ─── DESIGN TOKENS ───────────────────────────────────────────
 * CSS custom properties mapped to [r,g,b] arrays (0–255) for ScriptUI graphics API.
 * ScriptUI does not support hex strings — all colors live here as token arrays.
 */


var T = {
    gray50:   [26,  26,  26 ],   // --gray-50  app/dialog background
    gray75:   [30,  30,  30 ],   // --gray-75  panel background
    gray100:  [37,  37,  37 ],   // --gray-100 elevated surface
    gray200:  [44,  44,  44 ],   // --gray-200 input fill / card bg
    gray300:  [50,  50,  50 ],   // --gray-300 hover surface / divider
    gray400:  [61,  61,  61 ],   // --gray-400 strong border / muted control
    gray600:  [110, 110, 110],   // --gray-600 muted label / subtitle
    gray700:  [144, 144, 144],   // --gray-700 secondary text / icon default
    gray800:  [179, 179, 179],   // --gray-800 body text secondary
    gray900:  [216, 216, 216],   // --gray-900 primary body text
    gray950:  [235, 235, 235],   // --gray-950 highest-emphasis text
    blue400:  [20,  115, 230],   // --blue-400 primary action / active
    blue500:  [13,  102, 208],   // --blue-500 blue hover
    green400: [45,  157, 120],   // --green-400 success / CTA
    red400:   [227, 72,  80 ],   // --red-400  error / destructive
    orange400:[230, 134, 25 ],   // --orange-400 warning / billboard accent
    purple400:[124, 101, 216],   // --purple-400 digital ads accent
    ffOrange: [255, 92,  0  ],   // --ff-orange brand gradient start
    ffRed:    [227, 72,  80 ]    // --ff-red   brand gradient end
};

// Category accent colors — semantic color coding per style guide
var CAT_COLOR = {
    "FDI Defaults":              T.green400,
    "Social Media":              T.blue400,
    "Print Ads":                 T.gray700,
    "Billboards & Out-of-Home":  T.orange400,
    "Digital Ads (IAB)":         T.purple400
};

// ─── HERO ILLUSTRATION (base64 PNG) ──────────────────────────
// Decoded to a temp file at runtime so ScriptUI can load it as an image.

var HERO_PNG_B64 = "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";

function writeHeroFile() {
    var f = new File(Folder.temp.fsName + "/firefly-artboard-hero.png");
    f.encoding = "BINARY";
    f.open("w");
    // ExtendScript has no native base64 — use a quick decoder
    var b64 = HERO_PNG_B64;
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var bytes = "";
    for (var i = 0; i < b64.length; i += 4) {
        var c1 = chars.indexOf(b64.charAt(i));
        var c2 = chars.indexOf(b64.charAt(i + 1));
        var c3 = chars.indexOf(b64.charAt(i + 2));
        var c4 = chars.indexOf(b64.charAt(i + 3));
        var b1 = (c1 << 2) | (c2 >> 4);
        var b2 = ((c2 & 15) << 4) | (c3 >> 2);
        var b3 = ((c3 & 3) << 6) | c4;
        bytes += String.fromCharCode(b1);
        if (b64.charAt(i + 2) !== "=") bytes += String.fromCharCode(b2);
        if (b64.charAt(i + 3) !== "=") bytes += String.fromCharCode(b3);
    }
    f.write(bytes);
    f.close();
    return f;
}


// ─── DATA ────────────────────────────────────────────────────

var CATEGORIES = {
    "FDI Defaults": [
        { label: "Wide - 2.8:1 - 1008x360 px",      w: 1008, h: 360,  unit: "px" },
        { label: "Landscape - 3:2 - 720x480 px",     w: 720,  h: 480,  unit: "px" },
        { label: "Square - 1:1 - 540x540 px",        w: 540,  h: 540,  unit: "px" },
        { label: "Portrait - 2:3 - 480x720 px",      w: 480,  h: 720,  unit: "px" },
        { label: "Tall - 1:2.8 - 360x1008 px",       w: 360,  h: 1008, unit: "px" }
    ],
    "Social Media": [
        { label: "Instagram - Feed (Square) - 1:1 - 1080x1080 px", w: 1080, h: 1080, unit: "px" },
        { label: "Instagram - Feed (Portrait) - 4:5 - 1080x1350 px", w: 1080, h: 1350, unit: "px" },
        { label: "Instagram - Story / Reel - 9:16 - 1080x1920 px", w: 1080, h: 1920, unit: "px" },
        { label: "Facebook - Feed Post - 40:21 - 1200x630 px", w: 1200, h: 630, unit: "px" },
        { label: "Facebook - Story - 9:16 - 1080x1920 px", w: 1080, h: 1920, unit: "px" },
        { label: "Facebook - Cover Photo - 2.70:1 - 851x315 px", w: 851, h: 315, unit: "px" },
        { label: "X / Twitter - Post Image - 16:9 - 1200x675 px", w: 1200, h: 675, unit: "px" },
        { label: "X / Twitter - Header - 3:1 - 1500x500 px", w: 1500, h: 500, unit: "px" },
        { label: "LinkedIn - Post Image - 1.91:1 - 1200x627 px", w: 1200, h: 627, unit: "px" },
        { label: "LinkedIn - Cover Image - 4:1 - 1584x396 px", w: 1584, h: 396, unit: "px" },
        { label: "TikTok - Video / Post - 9:16 - 1080x1920 px", w: 1080, h: 1920, unit: "px" },
        { label: "YouTube - Thumbnail - 16:9 - 1280x720 px", w: 1280, h: 720, unit: "px" },
        { label: "YouTube - Channel Art - 16:9 - 2560x1440 px", w: 2560, h: 1440, unit: "px" },
        { label: "Pinterest - Pin (Standard) - 2:3 - 1000x1500 px", w: 1000, h: 1500, unit: "px" }
    ],
    "Print Ads": [
        { label: "Full Page (US) - 8:11 - 8.5x11 in", w: 8.5, h: 11, unit: "in" },
        { label: "Half Page (Horizontal) - 8:5 - 8.5x5.5 in", w: 8.5, h: 5.5, unit: "in" },
        { label: "Half Page (Vertical) - 4:11 - 4.25x11 in", w: 4.25, h: 11, unit: "in" },
        { label: "Quarter Page - 4:5 - 4.25x5.5 in", w: 4.25, h: 5.5, unit: "in" },
        { label: "Business Card - 3:2 - 3.5x2 in", w: 3.5, h: 2, unit: "in" },
        { label: "Postcard (Standard) - 2:3 - 4x6 in", w: 4, h: 6, unit: "in" },
        { label: "Postcard (Large) - 5:7 - 5x7 in", w: 5, h: 7, unit: "in" },
        { label: "Flyer / Letter - 8:11 - 8.5x11 in", w: 8.5, h: 11, unit: "in" },
        { label: "A4 International - 8:11 - 8.27x11.7 in", w: 8.27, h: 11.7, unit: "in" },
        { label: "Tabloid / Newspaper - 11:17 - 11x17 in", w: 11, h: 17, unit: "in" },
        { label: "Brochure Tri-fold - 8:11 - 8.5x11 in", w: 8.5, h: 11, unit: "in" }
    ],
    "Billboards & Out-of-Home": [
        { label: "Bulletin Billboard - 7:24 - 168x576 in", w: 168, h: 576, unit: "in" },
        { label: "Poster Billboard - 5:11 - 120x264 in", w: 120, h: 264, unit: "in" },
        { label: "Junior Poster - 1:2 - 72x144 in", w: 72, h: 144, unit: "in" },
        { label: "Digital Billboard - 32:11 - 1920x660 px", w: 1920, h: 660, unit: "px" },
        { label: "Bus Shelter - 2:3 - 48x72 in", w: 48, h: 72, unit: "in" },
        { label: "Bus Side (King) - 3:8 - 27x72 in", w: 27, h: 72, unit: "in" },
        { label: "Subway / Transit Card - 11:17 - 11x17 in", w: 11, h: 17, unit: "in" },
        { label: "Wild Posting - 2:3 - 24x36 in", w: 24, h: 36, unit: "in" }
    ],
    "Digital Ads (IAB)": [
        { label: "Leaderboard - 8.09:1 - 728x90 px", w: 728, h: 90, unit: "px" },
        { label: "Medium Rectangle - 6:5 - 300x250 px", w: 300, h: 250, unit: "px" },
        { label: "Large Rectangle - 6:5 - 336x280 px", w: 336, h: 280, unit: "px" },
        { label: "Half Page / Filmstrip - 1:2 - 300x600 px", w: 300, h: 600, unit: "px" },
        { label: "Wide Skyscraper - 4:15 - 160x600 px", w: 160, h: 600, unit: "px" },
        { label: "Billboard (Digital) - 3.88:1 - 970x250 px", w: 970, h: 250, unit: "px" },
        { label: "Mobile Banner - 32:5 - 320x50 px", w: 320, h: 50, unit: "px" },
        { label: "Mobile Interstitial - 2:3 - 320x480 px", w: 320, h: 480, unit: "px" },
        { label: "Square - 1:1 - 250x250 px", w: 250, h: 250, unit: "px" },
        { label: "Small Square - 1:1 - 200x200 px", w: 200, h: 200, unit: "px" },
        { label: "Vertical Rectangle - 3:5 - 240x400 px", w: 240, h: 400, unit: "px" },
        { label: "Large Leaderboard - 10.78:1 - 970x90 px", w: 970, h: 90, unit: "px" }
    ]
};

var CATEGORY_NAMES = ["FDI Defaults", "Social Media", "Print Ads", "Billboards & Out-of-Home", "Digital Ads (IAB)"];

// ─── UNIT CONVERSION ─────────────────────────────────────────

function toPts(value, unit) {
    if (unit === "px")  return value;
    if (unit === "in")  return value * 72;
    if (unit === "mm")  return value * 2.8346;
    return value;
}


// ─── STYLE HELPERS ───────────────────────────────────────────

function setBg(el, rgb) {
    try {
        el.graphics.backgroundColor = el.graphics.newBrush(
            el.graphics.BrushType.SOLID_COLOR,
            [rgb[0]/255, rgb[1]/255, rgb[2]/255, 1]
        );
    } catch (e) {}
}

function setFg(el, rgb) {
    try {
        el.graphics.foregroundColor = el.graphics.newPen(
            el.graphics.PenType.SOLID_COLOR,
            [rgb[0]/255, rgb[1]/255, rgb[2]/255, 1], 1
        );
    } catch (e) {}
}

function uiFont(size, bold) {
    return ScriptUI.newFont("Tahoma", bold ? "BOLD" : "REGULAR", size || 12);
}

function styleCheck(cb) {
    setBg(cb, T.gray100);
    setFg(cb, T.gray900);
    cb.font = uiFont(12);
}

function styleLabel(el, color) {
    setFg(el, color || T.gray600);
    el.font = uiFont(10);
}

function styleInput(el) {
    setBg(el, T.gray200);
    setFg(el, T.gray900);
    el.font = uiFont(12);
}

function styleDrop(el) {
    setBg(el, T.gray200);
    setFg(el, T.gray900);
    el.font = uiFont(12);
}

// ─── DIALOG ──────────────────────────────────────────────────

function buildDialog() {

    var dlg = new Window("dialog", "Artboard Generator");
    dlg.orientation   = "column";
    dlg.alignChildren = ["fill", "top"];
    dlg.margins       = 14;
    dlg.spacing       = 8;
    setBg(dlg, T.gray75);

    // ── Category row
    // Hero illustration — geometric artboard shapes
    try {
        var heroFile = writeHeroFile();
        var heroImg  = dlg.add("image", undefined, heroFile);
        heroImg.alignment = ["fill", "top"];
    } catch (e) {
        // Silently skip hero if file write fails
    }

    var promptLbl = dlg.add("statictext", undefined, "What format do you need?");
    setFg(promptLbl, T.gray900);
    promptLbl.font = uiFont(14, true);

    var catRow = dlg.add("group");
    catRow.orientation   = "row";
    catRow.alignChildren = ["left", "center"];
    catRow.spacing = 8;
    catRow.margins = [0, 2, 0, 0];
    setBg(catRow, T.gray75);

    var dropItems = ["Select output category"].concat(CATEGORY_NAMES);
    var catDrop = catRow.add("dropdownlist", [0, 0, 240, 24], dropItems);
    catDrop.selection = 0;  // show placeholder
    styleDrop(catDrop);

    // ── Sizes card
    var sizesCard = dlg.add("panel", undefined, "");
    sizesCard.orientation   = "column";
    sizesCard.alignChildren = ["fill", "top"];
    sizesCard.margins       = [8, 8, 8, 8];
    sizesCard.spacing       = 6;
    setBg(sizesCard, T.gray100);

    // Header row — painted group acting as section header bar
    var sizesHdr = sizesCard.add("group");
    sizesHdr.orientation   = "row";
    sizesHdr.alignChildren = ["left", "center"];
    sizesHdr.preferredSize = [-1, 26];
    sizesHdr.margins       = [6, 0, 0, 0];
    sizesHdr.spacing       = 8;
    setBg(sizesHdr, T.gray200);

    // Accent dot — small colored square mimicking the left stripe
    var accentDot = sizesHdr.add("panel", undefined, "");
    accentDot.preferredSize = [3, 14];
    accentDot.margins = 0;
    setBg(accentDot, CAT_COLOR[CATEGORY_NAMES[0]]);

    var sizesHdrLbl = sizesHdr.add("statictext", undefined, "SIZES");
    styleLabel(sizesHdrLbl, T.gray600);

    // Select / Clear All row
    var selRow = sizesCard.add("group");
    selRow.orientation   = "row";
    selRow.alignChildren = ["left", "center"];
    selRow.spacing = 6;
    selRow.margins = [0, 0, 0, 0];
    setBg(selRow, T.gray100);

    var selectAllBtn = selRow.add("button", [0, 0, 84, 22], "Select All");
    var clearAllBtn  = selRow.add("button", [0, 0, 84, 22], "Clear All");
    setBg(selectAllBtn, T.gray300); setFg(selectAllBtn, T.gray800); selectAllBtn.font = uiFont(11);
    setBg(clearAllBtn,  T.gray300); setFg(clearAllBtn,  T.gray800); clearAllBtn.font  = uiFont(11);

    // Thin divider
    var sizeDiv = sizesCard.add("panel", undefined, "");
    sizeDiv.alignment = ["fill", "top"]; sizeDiv.preferredSize[1] = 1; sizeDiv.margins = 0;
    setBg(sizeDiv, T.gray300);

    // Checkbox group
    var cbGroup = sizesCard.add("group");
    cbGroup.orientation   = "column";
    cbGroup.alignChildren = ["left", "top"];
    cbGroup.preferredSize = [440, -1];  // height grows to fit all items
    cbGroup.minimumSize   = [440, 100];
    cbGroup.spacing       = 3;
    setBg(cbGroup, T.gray100);

    var checkboxes   = [];
    var currentSizes = [];

    function rebuildList(catName) {
        setBg(accentDot, CAT_COLOR[catName] || T.gray400);
        for (var k = checkboxes.length - 1; k >= 0; k--) cbGroup.remove(checkboxes[k]);
        checkboxes   = [];
        currentSizes = CATEGORIES[catName];
        for (var j = 0; j < currentSizes.length; j++) {
            var cb = cbGroup.add("checkbox", undefined, currentSizes[j].label);
            cb.value = true;
            styleCheck(cb);
            checkboxes.push(cb);
        }
        dlg.layout.layout(true);
    }

    catDrop.onChange = function () {
        if (catDrop.selection.index === 0) return;
        rebuildList(CATEGORY_NAMES[catDrop.selection.index - 1]);
        sizesCard.visible = true;
        optsCard.visible  = true;
        div2.visible      = true;
        btnGroup.visible  = true;
        dlg.layout.layout(true);
    };
    selectAllBtn.onClick = function () { for (var i = 0; i < checkboxes.length; i++) checkboxes[i].value = true; };
    clearAllBtn.onClick  = function () { for (var i = 0; i < checkboxes.length; i++) checkboxes[i].value = false; };

    // ── Options card
    var optsCard = dlg.add("panel", undefined, "");
    optsCard.orientation   = "column";
    optsCard.alignChildren = ["fill", "top"];
    optsCard.margins       = [8, 8, 8, 8];
    optsCard.spacing       = 8;
    setBg(optsCard, T.gray100);

    var optsHdr = optsCard.add("group");
    optsHdr.orientation   = "row";
    optsHdr.alignChildren = ["left", "center"];
    optsHdr.preferredSize = [-1, 26];
    optsHdr.margins       = [6, 0, 0, 0];
    setBg(optsHdr, T.gray200);

    var optsHdrLbl = optsHdr.add("statictext", undefined, "OPTIONS");
    styleLabel(optsHdrLbl, T.gray600);

    var optsDiv = optsCard.add("panel", undefined, "");
    optsDiv.alignment = ["fill", "top"]; optsDiv.preferredSize[1] = 1; optsDiv.margins = 0;
    setBg(optsDiv, T.gray300);

    var gapRow = optsCard.add("group");
    gapRow.orientation   = "row";
    gapRow.alignChildren = ["left", "center"];
    gapRow.spacing = 8;
    setBg(gapRow, T.gray100);

    var gapLabel = gapRow.add("statictext", undefined, "GAP BETWEEN ARTBOARDS (px)");
    styleLabel(gapLabel);
    var gapField = gapRow.add("edittext", [0, 0, 52, 22], "40");
    styleInput(gapField);

    var labelRow = optsCard.add("group");
    labelRow.orientation   = "row";
    labelRow.alignChildren = ["left", "center"];
    labelRow.spacing = 8;
    setBg(labelRow, T.gray100);

    var addGuidesCb = labelRow.add("checkbox", undefined, "Add name label above each artboard");
    addGuidesCb.value = true;
    styleCheck(addGuidesCb);

    // ── Divider + buttons
    var div2 = dlg.add("panel", undefined, "");
    div2.alignment = ["fill", "top"]; div2.preferredSize[1] = 1;
    setBg(div2, T.gray300);

    var btnGroup = dlg.add("group");
    btnGroup.orientation   = "row";
    btnGroup.alignment     = ["right", "center"];
    btnGroup.alignChildren = ["right", "center"];
    btnGroup.spacing = 8;
    btnGroup.margins = [0, 2, 0, 0];
    setBg(btnGroup, T.gray75);

    var cancelBtn   = btnGroup.add("button", [0, 0, 90, 28],  "Cancel",   { name: "cancel" });
    var generateBtn = btnGroup.add("button", [0, 0, 114, 28], "Generate", { name: "ok" });
    setBg(cancelBtn,   T.gray300); setFg(cancelBtn,   T.gray800); cancelBtn.font   = uiFont(12);
    setBg(generateBtn, T.blue400); setFg(generateBtn, T.gray950); generateBtn.font = uiFont(12, true);
    generateBtn.active = true;

    // Hide everything until user picks a category
    sizesCard.visible = false;
    optsCard.visible  = false;
    div2.visible      = false;
    btnGroup.visible  = false;

    cancelBtn.onClick = function () { dlg.close(0); };
    generateBtn.onClick = function () {
        var selected = [];
        var catName  = CATEGORY_NAMES[catDrop.selection.index - 1];
        for (var i = 0; i < checkboxes.length; i++) {
            if (checkboxes[i].value) selected.push(currentSizes[i]);
        }
        if (selected.length === 0) { alert("Please select at least one size."); return; }
        var gap = parseInt(gapField.text, 10);
        if (isNaN(gap) || gap < 0) gap = 40;
        dlg.close(1);
        generateArtboards(selected, gap, addGuidesCb.value, catName);
    };

    return dlg;
}

// ─── ARTBOARD GENERATION ─────────────────────────────────────

function generateArtboards(sizes, gap, addLabels, catName) {

    var sorted = sizes.slice();
    sorted.sort(function(a, b) { return (b.w / b.h) - (a.w / a.h); });

    var count  = sorted.length;
    var PAD    = 50;
    var TARGET = 600;

    // Normalize each to aspect-ratio box (longest side = TARGET)
    var dims = [];
    for (var t = 0; t < count; t++) {
        var rawW = sorted[t].w;
        var rawH = sorted[t].h;
        var longest = Math.max(rawW, rawH);
        dims.push({
            w: Math.round((rawW / longest) * TARGET),
            h: Math.round((rawH / longest) * TARGET),
            label: sorted[t].label
        });
    }

    // Compute canvas dimensions
    var maxW = 0, totalH = PAD;
    for (var d = 0; d < dims.length; d++) {
        if (dims[d].w > maxW) maxW = dims[d].w;
        totalH += dims[d].h + gap;
    }
    var canvasW = maxW   + (PAD * 2);
    var canvasH = totalH + PAD;

    var doc = app.documents.add(DocumentColorSpace.RGB, canvasW, canvasH);
    doc.rulerUnits = RulerUnits.Points;
    doc.name = "Artboards - " + catName;

    // In Illustrator: canvas origin (0,0) is at center of canvas by default
    // artboardRect = [left, top, right, bottom] where top > bottom numerically
    // Canvas goes from (-canvasW/2, canvasH/2) top-left to (canvasW/2, -canvasH/2) bottom-right
    var halfW = canvasW / 2;
    var halfH = canvasH / 2;

    // Start placing from top-left of canvas
    var leftX = -halfW + PAD;
    var topY  = halfH  - PAD;

    // Set artboard 0
    doc.artboards[0].artboardRect = [leftX, topY, leftX + dims[0].w, topY - dims[0].h];
    doc.artboards[0].name = dims[0].label;

    topY -= (dims[0].h + gap);

    for (var i = 1; i < count; i++) {
        try {
            var ab = doc.artboards.add([leftX, topY, leftX + dims[i].w, topY - dims[i].h]);
            ab.name = dims[i].label;
            topY -= (dims[i].h + gap);
        } catch (e) {
            alert("Stopped at " + (i+1) + "/" + count + ": " + e.message);
            break;
        }
    }

    app.executeMenuCommand("fitall");
    alert("Created " + doc.artboards.length + " of " + count + " artboards.");
}

// ─── HELPERS ─────────────────────────────────────────────────

function makeGray(brightness) {
    var c   = new RGBColor();
    c.red   = brightness;
    c.green = brightness;
    c.blue  = brightness;
    return c;
}

// ─── ENTRY POINT ─────────────────────────────────────────────

var dlg = buildDialog();
if (dlg.show() === 0) {
    // User cancelled — nothing to do
}

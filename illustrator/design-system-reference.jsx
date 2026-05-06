/**
 * Design System Reference PDF
 * ----------------------------
 * One-click cheat sheet for an Illustrator file structured as a design system
 * (artboards organized into categories like Transition / Impulse / Destination,
 * each available in multiple size classes like Wide, Square, Portrait, etc.).
 *
 * Run: File > Scripts > Other Script... (Ctrl/Cmd + F12) → pick this .jsx
 * Output: <yourfile>_reference.pdf next to the source file (or Desktop if unsaved).
 *
 * The PDF contains:
 *   1. Cover — system overview, naming key, document constants
 *   2. Category × Size matrix — what variants exist
 *   3. Dimensions table — every size class with measurements
 *   4. Element inventory — what layers/elements appear across the system
 *   5. Fonts in use
 *   6. Brand colors (sampled from non-image fills)
 *   7. Anomalies — anything breaking the pattern
 */

#target illustrator

(function () {
    if (app.documents.length === 0) {
        alert("Open a document first.");
        return;
    }

    // =====================================================================
    // CONFIG
    // =====================================================================
    var ARTBOARD_LAYER_PATTERN = /^artboard\s*\d+/i;
    // Size class keywords detected in artboard names (case-insensitive)
    var SIZE_KEYWORDS = ["Wide", "Square", "Portrait", "Tall", "Landscape"];

    // Page geometry (US Letter, points)
    var PAGE_W = 612, PAGE_H = 792;
    var M_X = 54, M_Y = 54;
    var CONTENT_W = PAGE_W - 2 * M_X;

    // Type sizes
    var T_TITLE  = 22;
    var T_H1     = 15;
    var T_H2     = 11;
    var T_BODY   = 9.5;
    var T_SMALL  = 8;
    var T_LABEL  = 7.5;
    var LEAD     = 1.4;

    // Colors (RGB 0-255)
    var INK    = [20, 22, 26];
    var MUTED  = [91, 98, 113];
    var FAINT  = [152, 160, 176];
    var ACCENT = [40, 86, 184];
    var RULE   = [220, 224, 232];
    var SOFT   = [244, 246, 250];

    // =====================================================================
    // 1. WALK THE SOURCE DOC — gather raw data
    // =====================================================================
    var src = app.activeDocument;

    // ---- Artboards ----
    var artboards = []; // { num, name, w, h, sizeClass, category, baseLabel }
    for (var i = 0; i < src.artboards.length; i++) {
        var ab = src.artboards[i];
        var r = ab.artboardRect; // [l, t, r, b], y up
        artboards.push({
            num:    i + 1,
            name:   ab.name,
            w:      Math.round(r[2] - r[0]),
            h:      Math.round(r[1] - r[3]),
            left:   r[0], top: r[1], right: r[2], bottom: r[3]
        });
    }

    // ---- Detect size class & category from name ----
    function detectSizeClass(name) {
        for (var k = 0; k < SIZE_KEYWORDS.length; k++) {
            if (name.toLowerCase().indexOf(SIZE_KEYWORDS[k].toLowerCase()) !== -1) {
                return SIZE_KEYWORDS[k];
            }
        }
        return "Other";
    }

    // Category from layer hierarchy: walk top-level layers; if a layer is a
    // wrapper (children look like artboard layers), its name is a category
    // and applies to all artboards whose layers are inside it.
    var categoryByArtboardName = {}; // artboard name → category
    function isCategoryWrapper(layer) {
        if (!layer.layers || !layer.layers.length) return false;
        for (var i = 0; i < layer.layers.length; i++) {
            if (ARTBOARD_LAYER_PATTERN.test(layer.layers[i].name)) return true;
        }
        return false;
    }
    for (var li = 0; li < src.layers.length; li++) {
        var topL = src.layers[li];
        if (isCategoryWrapper(topL)) {
            for (var sj = 0; sj < topL.layers.length; sj++) {
                categoryByArtboardName[topL.layers[sj].name] = topL.name;
            }
        }
    }

    // Match each artboard to a category by finding its layer name as a
    // substring (artboard names like "01-Campaign-Wide-1" while layers are
    // "Artboard 1" — so we map by index too).
    // Better approach: artboard #N corresponds to the Nth artboard layer
    // inside whichever wrapper. So walk wrappers in order and assign.
    var artboardIndexCursor = 0;
    function assignCategoriesByOrder() {
        // Reset
        for (var ai = 0; ai < artboards.length; ai++) artboards[ai].category = "";
        for (var li = 0; li < src.layers.length; li++) {
            var topL = src.layers[li];
            if (isCategoryWrapper(topL)) {
                // Sublayers in order = artboards in order within this category
                for (var sj = 0; sj < topL.layers.length; sj++) {
                    if (ARTBOARD_LAYER_PATTERN.test(topL.layers[sj].name)) {
                        if (artboardIndexCursor < artboards.length) {
                            artboards[artboardIndexCursor].category = topL.name;
                            artboardIndexCursor++;
                        }
                    }
                }
            } else if (ARTBOARD_LAYER_PATTERN.test(topL.name)) {
                if (artboardIndexCursor < artboards.length) {
                    artboards[artboardIndexCursor].category = "";
                    artboardIndexCursor++;
                }
            }
        }
    }
    assignCategoriesByOrder();

    // For each artboard, compute size class and a base layout label
    // (e.g. "Square", "Wide", "Portrait")
    for (var ai = 0; ai < artboards.length; ai++) {
        artboards[ai].sizeClass = detectSizeClass(artboards[ai].name);
        artboards[ai].baseLabel = artboards[ai].sizeClass;
    }

    // ---- Walk all page items to collect elements, fonts, colors, links ----
    var elements      = []; // { artNum, sublayer, type, text?, fontName?, fontSize?, fillHex? }
    var fontUsage     = {}; // fontName → count
    var fontSizes     = {}; // fontName → set of sizes
    var fillColors    = {}; // hex/value → { count, kind, sample }
    var linkedFiles   = {}; // path → { count, missing, color, ppi, dims, sizeKB, name }
    var elementsByArtboard = {}; // num → { sublayerName: count }
    var sublayersAcrossSystem = {}; // sublayer name → count

    function rgbToHex(c) {
        function h(v) { var s = Math.round(v).toString(16); return s.length === 1 ? "0" + s : s; }
        return ("#" + h(c.red) + h(c.green) + h(c.blue)).toUpperCase();
    }
    function cmykStr(c) {
        return "C" + Math.round(c.cyan) + " M" + Math.round(c.magenta) +
               " Y" + Math.round(c.yellow) + " K" + Math.round(c.black);
    }
    function describeFill(c) {
        if (!c) return null;
        switch (c.typename) {
            case "RGBColor":  return { kind: "RGB",  value: rgbToHex(c) };
            case "CMYKColor": return { kind: "CMYK", value: cmykStr(c) };
            case "GrayColor": return { kind: "Gray", value: "Gray " + Math.round(c.gray) + "%" };
            case "SpotColor": return { kind: "Spot", value: c.spot ? c.spot.name : "Spot" };
            case "GradientColor": return { kind: "Gradient", value: "Gradient" };
            case "PatternColor":  return { kind: "Pattern",  value: "Pattern" };
            case "NoColor":   return null;
            default: return { kind: c.typename, value: c.typename };
        }
    }

    // Find which artboard an item belongs to (by center point)
    function artboardNumFor(item) {
        var b;
        try { b = item.visibleBounds; } catch (e) { return null; }
        var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
        for (var i = 0; i < artboards.length; i++) {
            var a = artboards[i];
            if (cx >= a.left && cx <= a.right && cy <= a.top && cy >= a.bottom) {
                return a.num;
            }
        }
        return null;
    }

    // Walk a container, with current sublayer name and artboard layer name
    function walkContainer(container, sublayerName, artboardLayerName, depth) {
        if (depth > 20) return; // safety
        var items = container.pageItems;
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            try {
                if (it.typename === "GroupItem") {
                    walkContainer(it, sublayerName, artboardLayerName, depth + 1);
                    continue;
                }
                var artNum = artboardNumFor(it);
                var elem = {
                    artNum: artNum,
                    artboardLayer: artboardLayerName || "",
                    sublayer: sublayerName,
                    type: it.typename
                };

                // Track sublayer presence
                if (sublayerName) {
                    sublayersAcrossSystem[sublayerName] =
                        (sublayersAcrossSystem[sublayerName] || 0) + 1;
                    if (artNum) {
                        if (!elementsByArtboard[artNum]) elementsByArtboard[artNum] = {};
                        elementsByArtboard[artNum][sublayerName] =
                            (elementsByArtboard[artNum][sublayerName] || 0) + 1;
                    }
                }

                // Type-specific extraction
                if (it.typename === "TextFrame") {
                    try { elem.text = it.contents || ""; } catch (e) {}
                    try {
                        var ca = it.textRange.characterAttributes;
                        var fontName = "?", fontSize = null;
                        try { fontName = ca.textFont.name; } catch (e) {}
                        try { fontSize = Math.round(ca.size * 10) / 10; } catch (e) {}
                        elem.fontName = fontName;
                        elem.fontSize = fontSize;

                        if (fontName) {
                            fontUsage[fontName] = (fontUsage[fontName] || 0) + 1;
                            if (fontSize != null) {
                                if (!fontSizes[fontName]) fontSizes[fontName] = {};
                                fontSizes[fontName][String(fontSize)] = true;
                            }
                        }
                        var fill = describeFill(ca.fillColor);
                        if (fill) {
                            elem.fillKind = fill.kind;
                            elem.fillHex  = fill.value;
                            var key = fill.kind + "::" + fill.value;
                            if (!fillColors[key]) fillColors[key] = { count: 0, kind: fill.kind, value: fill.value };
                            fillColors[key].count++;
                        }
                    } catch (e) {}
                } else if (it.typename === "PathItem") {
                    try {
                        if (it.filled) {
                            var f = describeFill(it.fillColor);
                            if (f) {
                                elem.fillKind = f.kind;
                                elem.fillHex  = f.value;
                                var k2 = f.kind + "::" + f.value;
                                if (!fillColors[k2]) fillColors[k2] = { count: 0, kind: f.kind, value: f.value };
                                fillColors[k2].count++;
                            }
                        }
                    } catch (e) {}
                } else if (it.typename === "RasterItem" || it.typename === "PlacedItem") {
                    try {
                        var key3 = "";
                        var info = { count: 0, missing: false };
                        if (it.file) {
                            key3 = it.file.fsName;
                            info.name = it.file.name;
                            info.missing = !it.file.exists;
                            try { info.sizeKB = it.file.exists ? Math.round(it.file.length / 1024) : null; } catch (e) {}
                        }
                        if (it.typename === "RasterItem") {
                            try {
                                var s = String(it.imageColorSpace);
                                if (s.indexOf("CMYK") !== -1) info.color = "CMYK";
                                else if (s.indexOf("RGB") !== -1) info.color = "RGB";
                                else if (s.indexOf("Gray") !== -1) info.color = "Gray";
                                else info.color = s.split(".").pop();
                            } catch (e) {}
                            try {
                                if (it.HResolution && it.VResolution) {
                                    var bb = it.boundingBox;
                                    var pxW = Math.round((bb[2] - bb[0]) / 72 * it.HResolution);
                                    var pxH = Math.round((bb[1] - bb[3]) / 72 * it.VResolution);
                                    info.dims = pxW + "×" + pxH;
                                    var m = it.matrix;
                                    var sx = Math.sqrt(m.mValueA * m.mValueA + m.mValueB * m.mValueB);
                                    if (sx > 0) info.ppi = Math.round(it.HResolution / sx) + " ppi";
                                }
                            } catch (e) {}
                            try { info.embedded = !!it.embedded; } catch (e) {}
                        }
                        if (key3) {
                            if (!linkedFiles[key3]) linkedFiles[key3] = info;
                            linkedFiles[key3].count = (linkedFiles[key3].count || 0) + 1;
                        }
                    } catch (e) {}
                }

                elements.push(elem);
            } catch (er) { /* keep walking */ }
        }
    }

    // Walk from each top-level layer. Sublayer name = the immediate child
    // layer of an artboard layer (e.g. "Background", "Headline").
    function walkArtboardLayer(artboardLyr) {
        var artLayerName = artboardLyr.name;
        // Items directly on the artboard layer have no sublayer
        walkContainer(artboardLyr, "", artLayerName, 0);
        // Sublayers — each becomes the sublayerName for its descendants
        for (var i = 0; i < artboardLyr.layers.length; i++) {
            var sub = artboardLyr.layers[i];
            walkContainer(sub, sub.name, artLayerName, 0);
            // Recurse deeper sublayers, keeping the *top* sublayer name
            walkSubtree(sub, sub.name, artLayerName);
        }
    }
    function walkSubtree(layer, topSubName, artLayerName) {
        for (var i = 0; i < layer.layers.length; i++) {
            walkContainer(layer.layers[i], topSubName, artLayerName, 0);
            walkSubtree(layer.layers[i], topSubName, artLayerName);
        }
    }

    for (var li2 = 0; li2 < src.layers.length; li2++) {
        var L = src.layers[li2];
        if (isCategoryWrapper(L)) {
            for (var sj2 = 0; sj2 < L.layers.length; sj2++) {
                if (ARTBOARD_LAYER_PATTERN.test(L.layers[sj2].name)) {
                    walkArtboardLayer(L.layers[sj2]);
                }
            }
        } else if (ARTBOARD_LAYER_PATTERN.test(L.name)) {
            walkArtboardLayer(L);
        } else {
            // Not an artboard wrapper or artboard layer — walk anyway
            walkContainer(L, "", L.name, 0);
            walkSubtree(L, "", L.name);
        }
    }

    // =====================================================================
    // 2. ANALYZE — build cheat-sheet structures
    // =====================================================================

    // Categories list (in document order)
    var categoryOrder = [];
    var categorySeen = {};
    for (var ax = 0; ax < artboards.length; ax++) {
        var c = artboards[ax].category;
        if (c && !categorySeen[c]) { categorySeen[c] = true; categoryOrder.push(c); }
    }
    if (!categoryOrder.length) categoryOrder.push("(no zone)");

    // Size class list (in detected order)
    var sizeOrder = [];
    var sizeSeen = {};
    for (var ay = 0; ay < artboards.length; ay++) {
        var s = artboards[ay].sizeClass;
        if (!sizeSeen[s]) { sizeSeen[s] = true; sizeOrder.push(s); }
    }

    // Category × Size matrix
    var matrix = {}; // [category][size] = count
    for (var az = 0; az < artboards.length; az++) {
        var cat = artboards[az].category || "(no zone)";
        var sz  = artboards[az].sizeClass;
        if (!matrix[cat]) matrix[cat] = {};
        matrix[cat][sz] = (matrix[cat][sz] || 0) + 1;
    }

    // Dimensions per size class — collect all unique W×H per size class
    var dimsBySize = {}; // size → { "WxH": count }
    for (var aw = 0; aw < artboards.length; aw++) {
        var ar = artboards[aw];
        var key = ar.w + "×" + ar.h;
        if (!dimsBySize[ar.sizeClass]) dimsBySize[ar.sizeClass] = {};
        dimsBySize[ar.sizeClass][key] = (dimsBySize[ar.sizeClass][key] || 0) + 1;
    }

    // Element inventory: which sublayers exist on most artboards?
    var sublayerCoverage = {}; // sublayer → number of artboards it appears on
    for (var an = 0; an < artboards.length; an++) {
        var inv = elementsByArtboard[artboards[an].num] || {};
        for (var sn in inv) {
            if (inv.hasOwnProperty(sn)) {
                sublayerCoverage[sn] = (sublayerCoverage[sn] || 0) + 1;
            }
        }
    }

    // Anomalies
    var anomalies = []; // strings
    // CMYK items in an RGB doc (or vice versa)
    var docMode = (src.documentColorSpace == DocumentColorSpace.CMYK) ? "CMYK" : "RGB";
    var oddItems = 0;
    for (var ek in fillColors) {
        if (!fillColors.hasOwnProperty(ek)) continue;
        if (fillColors[ek].kind === "CMYK" && docMode === "RGB") oddItems += fillColors[ek].count;
        if (fillColors[ek].kind === "RGB"  && docMode === "CMYK") oddItems += fillColors[ek].count;
    }
    if (oddItems) anomalies.push(oddItems + " " + (docMode === "RGB" ? "CMYK" : "RGB") +
                                 " fill(s) in a " + docMode + " document");

    // Missing links
    var missingCount = 0;
    for (var lk in linkedFiles) {
        if (linkedFiles.hasOwnProperty(lk) && linkedFiles[lk].missing) missingCount++;
    }
    if (missingCount) anomalies.push(missingCount + " linked file(s) reported missing");

    // Artboards missing common sublayers
    var commonSubs = [];
    var artCount = artboards.length;
    for (var sk in sublayerCoverage) {
        if (sublayerCoverage[sk] >= artCount * 0.8) commonSubs.push(sk); // 80% rule
    }
    var missingSubsDetails = [];
    for (var an2 = 0; an2 < artboards.length; an2++) {
        var inv2 = elementsByArtboard[artboards[an2].num] || {};
        var missing = [];
        for (var ms = 0; ms < commonSubs.length; ms++) {
            if (!inv2[commonSubs[ms]]) missing.push(commonSubs[ms]);
        }
        if (missing.length) {
            missingSubsDetails.push("Artboard " + artboards[an2].num + " (" +
                artboards[an2].name + ") missing: " + missing.join(", "));
        }
    }

    // =====================================================================
    // 3. BUILD THE PDF DOC — one artboard per page, stacked vertically
    // =====================================================================
    // Decide how many "pages" we'll produce. We'll lay them out flowing top
    // to bottom, fixing one cheat-sheet section per page where possible.

    // We'll manage pages dynamically: start with 1, add more as we run out
    // of vertical space.

    var docName = "(unsaved)";
    try { docName = src.name; } catch (e) {}

    var pdfDoc = app.documents.add(DocumentColorSpace.RGB, PAGE_W, PAGE_H);
    // The default has 1 artboard; set its size precisely
    pdfDoc.artboards[0].artboardRect = [0, PAGE_H, PAGE_W, 0];

    // State: current page index, current y from top of that page
    var curPage = 0;
    var curY = M_Y;
    // Track each page's top-left origin in canvas coords
    var pageOrigins = [{ x: 0, y: PAGE_H }]; // x-left, y-top (canvas y up)

    function pageOrigin() { return pageOrigins[curPage]; }
    function canvasY(yFromTop) { return pageOrigin().y - yFromTop; }
    function canvasX(xFromLeft) { return pageOrigin().x + xFromLeft; }

    function newPage() {
        // Add a new artboard immediately below the previous one
        var prev = pdfDoc.artboards[curPage].artboardRect; // [l, t, r, b]
        var newTop    = prev[3] - 40; // 40pt gap so they don't touch
        var newBottom = newTop - PAGE_H;
        pdfDoc.artboards.add([prev[0], newTop, prev[0] + PAGE_W, newBottom]);
        curPage = pdfDoc.artboards.length - 1;
        pageOrigins.push({ x: prev[0], y: newTop });
        curY = M_Y;
    }

    function ensureSpace(needed) {
        if (curY + needed > PAGE_H - M_Y) newPage();
    }

    // ---- Drawing primitives ----
    function rgb(arr) {
        var c = new RGBColor();
        c.red = arr[0]; c.green = arr[1]; c.blue = arr[2];
        return c;
    }

    // Approximate width estimate (Helvetica). Conservative side for safety.
    function approxWidth(str, size, bold) {
        // Helvetica avg char width ≈ 0.52 * size regular, 0.55 * size bold
        return (str.length || 0) * size * (bold ? 0.55 : 0.52);
    }

    function wrapByWidth(str, maxW, size, bold) {
        if (!str) return [""];
        str = String(str).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        var paras = str.split("\n");
        var out = [];
        for (var p = 0; p < paras.length; p++) {
            if (paras[p] === "") { out.push(""); continue; }
            var words = paras[p].split(/\s+/);
            var line = "";
            for (var w = 0; w < words.length; w++) {
                var word = words[w];
                if (!word.length) continue;
                var tryLine = line ? line + " " + word : word;
                if (approxWidth(tryLine, size, bold) <= maxW) {
                    line = tryLine;
                } else {
                    if (line) out.push(line);
                    if (approxWidth(word, size, bold) > maxW) {
                        // Hard-break long word
                        var maxChars = Math.max(4, Math.floor(maxW / (size * (bold ? 0.55 : 0.52))));
                        while (word.length > maxChars) {
                            out.push(word.substring(0, maxChars));
                            word = word.substring(maxChars);
                        }
                        line = word;
                    } else {
                        line = word;
                    }
                }
            }
            if (line) out.push(line);
        }
        return out;
    }

    function drawText(str, xFromLeft, size, opts) {
        opts = opts || {};
        var bold    = !!opts.bold;
        var color   = opts.color || INK;
        var maxW    = opts.maxW || (CONTENT_W - (xFromLeft - M_X));
        var lines   = opts.noWrap ? [String(str || "")] : wrapByWidth(str, maxW, size, bold);
        var leading = size * LEAD;

        for (var i = 0; i < lines.length; i++) {
            ensureSpace(leading);
            var tf = pdfDoc.textFrames.pointText([canvasX(xFromLeft), canvasY(curY + size)]);
            tf.contents = lines[i];
            try {
                var ca = tf.textRange.characterAttributes;
                ca.size = size;
                ca.fillColor = rgb(color);
                try {
                    ca.textFont = app.textFonts.getByName(bold ? "Helvetica-Bold" : "Helvetica");
                } catch (e) {}
            } catch (e) {}
            curY += leading;
        }
    }

    function drawRule(color) {
        ensureSpace(8);
        var p = pdfDoc.pathItems.add();
        p.setEntirePath([
            [canvasX(M_X), canvasY(curY)],
            [canvasX(M_X + CONTENT_W), canvasY(curY)]
        ]);
        p.filled = false; p.stroked = true;
        p.strokeColor = rgb(color || RULE);
        p.strokeWidth = 0.5;
        curY += 8;
    }

    function drawSwatchBox(xFromLeft, yFromTop, size, fillColor) {
        var rect = pdfDoc.pathItems.rectangle(
            canvasY(yFromTop), canvasX(xFromLeft), size, size
        );
        rect.filled = true;
        rect.fillColor = rgb(fillColor);
        rect.stroked = true;
        rect.strokeColor = rgb(RULE);
        rect.strokeWidth = 0.4;
    }

    // Simple table renderer: array of rows (arrays of strings), col widths
    function drawTable(headers, rows, colWidths) {
        var headerH = T_SMALL * LEAD + 8;
        ensureSpace(headerH + 6);

        // Header bg
        var rect = pdfDoc.pathItems.rectangle(
            canvasY(curY + headerH), canvasX(M_X), CONTENT_W, headerH
        );
        rect.filled = true; rect.fillColor = rgb(SOFT);
        rect.stroked = false;

        // Header text
        var cx = M_X + 6;
        for (var hi = 0; hi < headers.length; hi++) {
            var tf = pdfDoc.textFrames.pointText([
                canvasX(cx), canvasY(curY + 4 + T_SMALL)
            ]);
            tf.contents = headers[hi];
            try {
                var ca = tf.textRange.characterAttributes;
                ca.size = T_SMALL;
                ca.fillColor = rgb(MUTED);
                try { ca.textFont = app.textFonts.getByName("Helvetica-Bold"); } catch (e) {}
            } catch (e) {}
            cx += colWidths[hi];
        }
        curY += headerH;

        // Body rows
        for (var r = 0; r < rows.length; r++) {
            // Wrap each cell
            var cellLines = [];
            var maxLines = 1;
            for (var c = 0; c < rows[r].length; c++) {
                var inner = colWidths[c] - 12;
                var lines = wrapByWidth(String(rows[r][c] == null ? "" : rows[r][c]),
                                        inner, T_SMALL, false);
                cellLines.push(lines);
                if (lines.length > maxLines) maxLines = lines.length;
            }
            var rowH = maxLines * T_SMALL * LEAD + 6;
            if (curY + rowH > PAGE_H - M_Y) {
                newPage();
                // Redraw header on new page
                drawTable(headers, rows.slice(r), colWidths);
                return;
            }

            // Row bottom rule
            var rule = pdfDoc.pathItems.add();
            rule.setEntirePath([
                [canvasX(M_X), canvasY(curY + rowH)],
                [canvasX(M_X + CONTENT_W), canvasY(curY + rowH)]
            ]);
            rule.filled = false; rule.stroked = true;
            rule.strokeColor = rgb(RULE);
            rule.strokeWidth = 0.25;

            // Cells
            cx = M_X + 6;
            for (var cc = 0; cc < cellLines.length; cc++) {
                var cellY = curY + 3;
                for (var ll = 0; ll < cellLines[cc].length; ll++) {
                    var tf2 = pdfDoc.textFrames.pointText([
                        canvasX(cx), canvasY(cellY + T_SMALL)
                    ]);
                    tf2.contents = cellLines[cc][ll];
                    try {
                        var ca2 = tf2.textRange.characterAttributes;
                        ca2.size = T_SMALL;
                        ca2.fillColor = rgb(INK);
                        try { ca2.textFont = app.textFonts.getByName("Helvetica"); } catch (e) {}
                    } catch (e) {}
                    cellY += T_SMALL * LEAD;
                }
                cx += colWidths[cc];
            }
            curY += rowH;
        }
        curY += 8;
    }

    // =====================================================================
    // 4. DRAW CONTENT
    // =====================================================================

    // ---- Header ----
    drawText("Design System Reference", M_X, T_TITLE, { bold: true });
    curY += 2;
    drawText(docName, M_X, T_H1, { color: ACCENT });
    curY += 6;
    drawRule();

    // ---- Quick facts ----
    drawText("Overview", M_X, T_H1, { bold: true });
    curY += 2;
    var overviewRows = [
        ["Document color mode", docMode],
        ["Artboards",            String(artboards.length)],
        ["Zones",                categoryOrder.join(", ")],
        ["Size classes",         sizeOrder.join(", ")],
        ["Generated",            new Date().toString()]
    ];
    drawTable(["", ""], overviewRows, [150, CONTENT_W - 150]);

    // ---- Naming key (if names follow a pattern) ----
    // Look at the first artboard with both a number prefix and a category
    var sampleName = "";
    for (var aN = 0; aN < artboards.length; aN++) {
        if (/^\d+/.test(artboards[aN].name)) { sampleName = artboards[aN].name; break; }
    }
    if (sampleName) {
        drawText("Naming key", M_X, T_H1, { bold: true });
        curY += 2;
        drawText("Example: " + sampleName, M_X, T_BODY, { color: MUTED });
        curY += 4;
        drawText(
            "Each artboard name encodes order, zone, size class, and variant. " +
            "Read components left-to-right separated by hyphens.",
            M_X, T_BODY
        );
        curY += 6;
    }

    // ---- Category × Size matrix ----
    drawText("Zone × Size", M_X, T_H1, { bold: true });
    curY += 2;
    drawText("Number of variants in each combination.", M_X, T_BODY, { color: MUTED });
    curY += 4;

    var matrixHeader = ["Zone"];
    for (var so = 0; so < sizeOrder.length; so++) matrixHeader.push(sizeOrder[so]);
    matrixHeader.push("Total");

    var matrixRows = [];
    for (var co = 0; co < categoryOrder.length; co++) {
        var cat2 = categoryOrder[co];
        var row = [cat2];
        var rowTotal = 0;
        for (var so2 = 0; so2 < sizeOrder.length; so2++) {
            var n = (matrix[cat2] && matrix[cat2][sizeOrder[so2]]) || 0;
            row.push(n ? String(n) : "—");
            rowTotal += n;
        }
        row.push(String(rowTotal));
        matrixRows.push(row);
    }
    // Total row
    var totalRow = ["Total"];
    var grandTotal = 0;
    for (var so3 = 0; so3 < sizeOrder.length; so3++) {
        var colTotal = 0;
        for (var co2 = 0; co2 < categoryOrder.length; co2++) {
            colTotal += (matrix[categoryOrder[co2]] && matrix[categoryOrder[co2]][sizeOrder[so3]]) || 0;
        }
        totalRow.push(String(colTotal));
        grandTotal += colTotal;
    }
    totalRow.push(String(grandTotal));
    matrixRows.push(totalRow);

    var colW = [];
    var firstColW = 100;
    var lastColW = 50;
    var middleW = (CONTENT_W - firstColW - lastColW) / sizeOrder.length;
    colW.push(firstColW);
    for (var sw = 0; sw < sizeOrder.length; sw++) colW.push(middleW);
    colW.push(lastColW);

    drawTable(matrixHeader, matrixRows, colW);

    // ---- Dimensions ----
    drawText("Dimensions", M_X, T_H1, { bold: true });
    curY += 2;
    drawText("Sizes used in each class. Multiple values mean variants exist within the class.",
             M_X, T_BODY, { color: MUTED });
    curY += 4;

    var dimRows = [];
    for (var di = 0; di < sizeOrder.length; di++) {
        var sc = sizeOrder[di];
        var dims = dimsBySize[sc] || {};
        var keys = [];
        for (var dk in dims) if (dims.hasOwnProperty(dk)) keys.push(dk);
        keys.sort();
        for (var dki = 0; dki < keys.length; dki++) {
            var dk2 = keys[dki];
            dimRows.push([
                dki === 0 ? sc : "",
                dk2 + " pt",
                String(dims[dk2])
            ]);
        }
    }
    drawTable(["Size class", "Dimensions", "Count"], dimRows,
              [150, 250, CONTENT_W - 400]);

    // ---- Element inventory ----
    drawText("Element inventory", M_X, T_H1, { bold: true });
    curY += 2;
    drawText("Sublayers found across the system, sorted by coverage.",
             M_X, T_BODY, { color: MUTED });
    curY += 4;

    var subList = [];
    for (var sN in sublayerCoverage) {
        if (sublayerCoverage.hasOwnProperty(sN)) {
            subList.push({ name: sN, count: sublayerCoverage[sN] });
        }
    }
    subList.sort(function (a, b) { return b.count - a.count; });

    var subRows = [];
    for (var sli = 0; sli < subList.length; sli++) {
        var sl = subList[sli];
        var pct = artCount > 0 ? Math.round(100 * sl.count / artCount) : 0;
        var coverage = (pct === 100) ? "All artboards"
                     : (pct >= 80)  ? "Most (" + sl.count + " of " + artCount + ")"
                     : sl.count + " of " + artCount;
        subRows.push([sl.name, String(sl.count), coverage]);
    }
    drawTable(["Sublayer", "Instances", "Coverage"], subRows,
              [180, 100, CONTENT_W - 280]);

    // ---- Fonts ----
    drawText("Fonts in use", M_X, T_H1, { bold: true });
    curY += 2;

    var fontList = [];
    for (var fN in fontUsage) if (fontUsage.hasOwnProperty(fN)) {
        var sizes = [];
        if (fontSizes[fN]) {
            for (var sZ in fontSizes[fN]) if (fontSizes[fN].hasOwnProperty(sZ)) {
                sizes.push(parseFloat(sZ));
            }
            sizes.sort(function (a, b) { return a - b; });
        }
        fontList.push({ name: fN, count: fontUsage[fN], sizes: sizes });
    }
    fontList.sort(function (a, b) { return b.count - a.count; });

    if (fontList.length === 0) {
        drawText("No fonts detected.", M_X, T_BODY, { color: MUTED });
        curY += 6;
    } else {
        var fontRows = [];
        for (var fi = 0; fi < fontList.length; fi++) {
            var f2 = fontList[fi];
            var sizesStr = f2.sizes.length ? f2.sizes.join(", ") + " pt" : "—";
            fontRows.push([f2.name, String(f2.count), sizesStr]);
        }
        drawTable(["Font", "Uses", "Sizes"], fontRows,
                  [220, 60, CONTENT_W - 280]);
    }

    // ---- Brand colors ----
    drawText("Brand colors", M_X, T_H1, { bold: true });
    curY += 2;
    drawText("Sampled from text and shape fills (images excluded).",
             M_X, T_BODY, { color: MUTED });
    curY += 6;

    var colorList = [];
    for (var ck in fillColors) if (fillColors.hasOwnProperty(ck)) {
        colorList.push(fillColors[ck]);
    }
    colorList.sort(function (a, b) { return b.count - a.count; });

    if (colorList.length === 0) {
        drawText("No solid fills detected.", M_X, T_BODY, { color: MUTED });
        curY += 6;
    } else {
        // Draw as swatch grid: 4 per row
        var perRow = 4;
        var swatchW = (CONTENT_W - (perRow - 1) * 12) / perRow;
        var swatchSize = 14;
        var rowH = 32;

        for (var ci = 0; ci < colorList.length; ci++) {
            var col = ci % perRow;
            if (col === 0) ensureSpace(rowH);
            var x = M_X + col * (swatchW + 12);
            var y = curY;

            // Swatch box (only render colored box if RGB hex parseable)
            if (colorList[ci].kind === "RGB") {
                var hex = colorList[ci].value;
                if (/^#([0-9A-F]{6})$/i.test(hex)) {
                    var rH = parseInt(hex.substr(1, 2), 16);
                    var gH = parseInt(hex.substr(3, 2), 16);
                    var bH = parseInt(hex.substr(5, 2), 16);
                    drawSwatchBox(x, y, swatchSize, [rH, gH, bH]);
                }
            } else {
                // Non-RGB: draw a hollow box
                var rect2 = pdfDoc.pathItems.rectangle(
                    canvasY(y + swatchSize), canvasX(x), swatchSize, swatchSize
                );
                rect2.filled = false; rect2.stroked = true;
                rect2.strokeColor = rgb(RULE);
                rect2.strokeWidth = 0.5;
            }

            // Label next to swatch
            var labelX = x + swatchSize + 6;
            var labelW = swatchW - swatchSize - 6;
            var tf3 = pdfDoc.textFrames.pointText([canvasX(labelX), canvasY(y + 9)]);
            tf3.contents = colorList[ci].value;
            try {
                var ca3 = tf3.textRange.characterAttributes;
                ca3.size = T_SMALL;
                ca3.fillColor = rgb(INK);
                try { ca3.textFont = app.textFonts.getByName("Helvetica-Bold"); } catch (e) {}
            } catch (e) {}

            var tf4 = pdfDoc.textFrames.pointText([canvasX(labelX), canvasY(y + 20)]);
            tf4.contents = colorList[ci].kind + " · " + colorList[ci].count + " use(s)";
            try {
                var ca4 = tf4.textRange.characterAttributes;
                ca4.size = T_LABEL;
                ca4.fillColor = rgb(MUTED);
                try { ca4.textFont = app.textFonts.getByName("Helvetica"); } catch (e) {}
            } catch (e) {}

            if (col === perRow - 1 || ci === colorList.length - 1) curY += rowH;
        }
    }

    // ---- Text strings (every text frame, by artboard then layer) ----
    var textElems = [];
    for (var te = 0; te < elements.length; te++) {
        var el = elements[te];
        if (el.type === "TextFrame" && el.text && el.text.replace(/\s+/g, "").length) {
            textElems.push(el);
        }
    }
    if (textElems.length) {
        drawText("Text strings", M_X, T_H1, { bold: true });
        curY += 2;
        drawText(textElems.length + " text frame(s) across the document.",
                 M_X, T_BODY, { color: MUTED });
        curY += 6;

        // Sort: artboard # ascending, then sublayer name, then text
        textElems.sort(function (a, b) {
            var na = a.artNum == null ? 1e9 : a.artNum;
            var nb = b.artNum == null ? 1e9 : b.artNum;
            if (na !== nb) return na - nb;
            var sa = a.sublayer || "", sb = b.sublayer || "";
            if (sa !== sb) return sa < sb ? -1 : 1;
            return (a.text < b.text) ? -1 : (a.text > b.text ? 1 : 0);
        });

        var textRows = [];
        for (var ti2 = 0; ti2 < textElems.length; ti2++) {
            var t2 = textElems[ti2];
            textRows.push([
                t2.artNum == null ? "—" : String(t2.artNum),
                t2.artboardLayer || "—",
                t2.sublayer || "—",
                t2.text
            ]);
        }
        drawTable(["Artboard", "Artboard Layer", "Sublayer", "Text"], textRows,
                  [50, 110, 100, CONTENT_W - 260]);
    }

    // ---- Linked images summary (with thumbnails) ----
    var linkList = [];
    for (var lk2 in linkedFiles) if (linkedFiles.hasOwnProperty(lk2)) {
        var li3 = linkedFiles[lk2];
        li3._path = lk2;
        linkList.push(li3);
    }
    if (linkList.length) {
        drawText("Linked images", M_X, T_H1, { bold: true });
        curY += 2;
        drawText(linkList.length + " unique file(s).", M_X, T_BODY, { color: MUTED });
        curY += 6;

        linkList.sort(function (a, b) { return b.count - a.count; });

        // Custom row layout: [thumb 36] [file 144] [color 50] [px 70] [ppi 50] [size 60] [used 40] [status]
        var THUMB_W      = 36;
        var THUMB_H      = 36;
        var ROW_H        = THUMB_H + 8;
        var COL_GAP      = 6;
        var thumbX       = M_X;
        var fileX        = thumbX + THUMB_W + COL_GAP;
        var fileW        = 144;
        var colorX       = fileX + fileW + COL_GAP;
        var colorW       = 44;
        var pxX          = colorX + colorW + COL_GAP;
        var pxW          = 64;
        var ppiX         = pxX + pxW + COL_GAP;
        var ppiW         = 44;
        var sizeX        = ppiX + ppiW + COL_GAP;
        var sizeW        = 56;
        var usedX        = sizeX + sizeW + COL_GAP;
        var usedW        = 32;
        var statusX      = usedX + usedW + COL_GAP;

        // Header row
        ensureSpace(20);
        var hdrBg = pdfDoc.pathItems.rectangle(
            canvasY(curY + 18), canvasX(M_X), CONTENT_W, 18
        );
        hdrBg.filled = true; hdrBg.fillColor = rgb(SOFT); hdrBg.stroked = false;

        function drawHdrCell(label, x) {
            var tf = pdfDoc.textFrames.pointText([canvasX(x), canvasY(curY + 12)]);
            tf.contents = label;
            try {
                var ca = tf.textRange.characterAttributes;
                ca.size = T_SMALL;
                ca.fillColor = rgb(MUTED);
                try { ca.textFont = app.textFonts.getByName("Helvetica-Bold"); } catch (e) {}
            } catch (e) {}
        }
        drawHdrCell("",         thumbX + 2);
        drawHdrCell("File",     fileX);
        drawHdrCell("Color",    colorX);
        drawHdrCell("Pixels",   pxX);
        drawHdrCell("PPI",      ppiX);
        drawHdrCell("Size",     sizeX);
        drawHdrCell("Used",     usedX);
        drawHdrCell("Status",   statusX);
        curY += 18;

        // Helper to draw a cell of text within a row (uses curY-relative rowTop passed in)
        function drawLinkCell(str, x, w, yOffset, rowTop, opts) {
            opts = opts || {};
            var size = opts.size || T_SMALL;
            var color = opts.color || INK;
            var bold = !!opts.bold;
            var lines = wrapByWidth(String(str || ""), w, size, bold);
            var ly = rowTop + yOffset;
            var maxLines = Math.min(lines.length, 2);
            for (var i = 0; i < maxLines; i++) {
                var t = pdfDoc.textFrames.pointText([canvasX(x), canvasY(ly + size)]);
                t.contents = (i === 1 && lines.length > 2)
                            ? lines[1].substring(0, Math.max(0, lines[1].length - 1)) + "…"
                            : lines[i];
                try {
                    var ca = t.textRange.characterAttributes;
                    ca.size = size;
                    ca.fillColor = rgb(color);
                    try {
                        ca.textFont = app.textFonts.getByName(bold ? "Helvetica-Bold" : "Helvetica");
                    } catch (e) {}
                } catch (e) {}
                ly += size * LEAD;
            }
        }

        // Data rows
        for (var lr = 0; lr < linkList.length; lr++) {
            var L2 = linkList[lr];

            // Page break if needed
            if (curY + ROW_H > PAGE_H - M_Y) {
                newPage();
                // Re-emit header (small, since the user knows the columns)
                ensureSpace(18);
                var hdr2 = pdfDoc.pathItems.rectangle(
                    canvasY(curY + 18), canvasX(M_X), CONTENT_W, 18
                );
                hdr2.filled = true; hdr2.fillColor = rgb(SOFT); hdr2.stroked = false;
                drawHdrCell("",         thumbX + 2);
                drawHdrCell("File",     fileX);
                drawHdrCell("Color",    colorX);
                drawHdrCell("Pixels",   pxX);
                drawHdrCell("PPI",      ppiX);
                drawHdrCell("Size",     sizeX);
                drawHdrCell("Used",     usedX);
                drawHdrCell("Status",   statusX);
                curY += 18;
            }

            var rowTop = curY;

            // Bottom rule
            var rowRule = pdfDoc.pathItems.add();
            rowRule.setEntirePath([
                [canvasX(M_X), canvasY(rowTop + ROW_H)],
                [canvasX(M_X + CONTENT_W), canvasY(rowTop + ROW_H)]
            ]);
            rowRule.filled = false; rowRule.stroked = true;
            rowRule.strokeColor = rgb(RULE);
            rowRule.strokeWidth = 0.25;

            // Thumbnail box (always drawn — content depends on availability)
            var boxLeft = canvasX(thumbX);
            var boxTop  = canvasY(rowTop + 4);
            var boxBg = pdfDoc.pathItems.rectangle(boxTop, boxLeft, THUMB_W, THUMB_H);
            boxBg.filled = true;
            boxBg.fillColor = rgb(SOFT);
            boxBg.stroked = true;
            boxBg.strokeColor = rgb(RULE);
            boxBg.strokeWidth = 0.4;

            // Place the file inside the thumb box if it exists & isn't missing
            var placed = null;
            if (L2._path && !L2.missing && !L2.embedded) {
                try {
                    var f = new File(L2._path);
                    if (f.exists) {
                        placed = pdfDoc.placedItems.add();
                        placed.file = f;
                        // Resize to fit the thumb box while preserving aspect ratio
                        var pw = placed.width, ph = placed.height;
                        if (pw > 0 && ph > 0) {
                            var scale = Math.min(THUMB_W / pw, THUMB_H / ph);
                            placed.width  = pw * scale;
                            placed.height = ph * scale;
                            // Center inside the box
                            var offX = (THUMB_W - placed.width) / 2;
                            var offY = (THUMB_H - placed.height) / 2;
                            placed.position = [
                                canvasX(thumbX + offX),
                                canvasY(rowTop + 4 + offY)
                            ];
                        }
                    }
                } catch (e) {
                    // Placement failed — leave the empty box
                    if (placed) { try { placed.remove(); } catch (er) {} placed = null; }
                }
            }

            // If no thumbnail rendered, show a small label inside the box
            if (!placed) {
                var noteText = L2.missing ? "missing"
                            : L2.embedded ? "embedded"
                            : "—";
                var nt = pdfDoc.textFrames.pointText([
                    canvasX(thumbX + 4), canvasY(rowTop + THUMB_H / 2 + 2)
                ]);
                nt.contents = noteText;
                try {
                    var nca = nt.textRange.characterAttributes;
                    nca.size = T_LABEL;
                    nca.fillColor = rgb(FAINT);
                    try { nca.textFont = app.textFonts.getByName("Helvetica"); } catch (e) {}
                } catch (e) {}
            }

            // File name (bold, possibly 2 lines)
            drawLinkCell(L2.name || "—", fileX, fileW, 4, rowTop, { bold: true });
            drawLinkCell(L2.color || "", colorX, colorW, 4, rowTop);
            drawLinkCell(L2.dims || "", pxX, pxW, 4, rowTop);
            drawLinkCell(L2.ppi || "", ppiX, ppiW, 4, rowTop);
            drawLinkCell(L2.sizeKB ? (L2.sizeKB + " KB") : "", sizeX, sizeW, 4, rowTop);
            drawLinkCell(String(L2.count), usedX, usedW, 4, rowTop);
            // Status (color-coded)
            var statusColor = L2.missing ? [179, 38, 30]
                            : L2.embedded ? MUTED
                            : INK;
            var statusText = L2.missing ? "MISSING"
                          : L2.embedded ? "Embedded"
                          : "OK";
            drawLinkCell(statusText, statusX, CONTENT_W - (statusX - M_X), 4, rowTop,
                         { color: statusColor, bold: !!L2.missing });

            curY += ROW_H;
        }
        curY += 6;
    }

    // ---- Anomalies ----
    if (anomalies.length || missingSubsDetails.length) {
        drawText("Notes & anomalies", M_X, T_H1, { bold: true });
        curY += 2;
        for (var aN2 = 0; aN2 < anomalies.length; aN2++) {
            drawText("• " + anomalies[aN2], M_X + 4, T_BODY);
        }
        if (missingSubsDetails.length) {
            curY += 4;
            drawText("Artboards missing common elements:", M_X, T_BODY, { color: MUTED });
            for (var msd = 0; msd < missingSubsDetails.length && msd < 30; msd++) {
                drawText("• " + missingSubsDetails[msd], M_X + 4, T_SMALL, { color: MUTED });
            }
            if (missingSubsDetails.length > 30) {
                drawText("…and " + (missingSubsDetails.length - 30) + " more",
                         M_X + 4, T_SMALL, { color: FAINT });
            }
        }
        curY += 6;
    }

    // ---- Page footers ----
    var totalPages = pdfDoc.artboards.length;
    for (var pp = 0; pp < totalPages; pp++) {
        var orig = pageOrigins[pp];
        var footer = docName + "  ·  " + (pp + 1) + " / " + totalPages;
        var ftf = pdfDoc.textFrames.pointText([
            orig.x + PAGE_W - M_X - approxWidth(footer, T_LABEL, false),
            orig.y - PAGE_H + M_Y / 2
        ]);
        ftf.contents = footer;
        try {
            var fca = ftf.textRange.characterAttributes;
            fca.size = T_LABEL;
            fca.fillColor = rgb(FAINT);
            try { fca.textFont = app.textFonts.getByName("Helvetica"); } catch (e) {}
        } catch (e) {}
    }

    // =====================================================================
    // 5. SAVE AS PDF
    // =====================================================================
    var outFile;
    try {
        var srcFile = src.fullName;
        var base = srcFile.name.replace(/\.[^.]+$/, "");
        outFile = new File(srcFile.parent.fsName + "/" + base + "_reference.pdf");
    } catch (er) {
        outFile = new File(Folder.desktop.fsName + "/reference.pdf");
    }

    var pdfOpts = new PDFSaveOptions();
    pdfOpts.compatibility = PDFCompatibility.ACROBAT7;
    pdfOpts.preserveEditability = false;
    pdfOpts.viewAfterSaving = false;
    pdfOpts.optimization = true;
    pdfOpts.generateThumbnails = false;
    pdfOpts.artboardRange = "";  // empty = all artboards, one per page

    pdfDoc.saveAs(outFile, pdfOpts);

    pdfDoc.close(SaveOptions.DONOTSAVECHANGES);
    try { src.activate(); } catch (e) {}

    alert(
        "Reference PDF generated.\n\n" +
        artboards.length + " artboard(s) analyzed across " +
        categoryOrder.length + " zone" + (categoryOrder.length === 1 ? "" : "s") + ".\n\n" +
        "Saved to:\n" + outFile.fsName
    );
})();

/** 
 * Author - J. Davis 
 * 0xjdavis@gmail.com
 *
 * Extract All Items by Artboard & Layer → CSV
 * --------------------------------------------
 * One row per page item, with metadata. Sorted Artboard # → Top Layer →
 * Sublayer Path → z-order (back to front).
 *
 * Smart layer handling:
 *   - If a top-level layer is a "category wrapper" (e.g. it only contains
 *     other layers named like artboard layers), the script descends into
 *     it and treats the inner per-artboard layer (e.g. "Artboard 1") as
 *     the Top Layer. This keeps Top Layer aligned with the artboards.
 *   - The wrapper name is preserved separately in the "Category" column.
 *
 * How to run:
 *   1. Open the .ai file in Illustrator.
 *   2. File > Scripts > Other Script...  (Ctrl/Cmd + F12)
 *   3. Pick this .jsx file.
 *   4. CSV is saved next to your .ai file (or to Desktop if unsaved).
 */

#target illustrator

(function () {
    if (app.documents.length === 0) {
        alert("Open a document first.");
        return;
    }

    // ---- Config ----------------------------------------------------------
    var OUTSIDE_LABEL    = "0";    // artboard # for items outside all artboards
    var INCLUDE_HIDDEN   = true;
    var INCLUDE_LOCKED   = true;
    var EMIT_GROUP_ROWS  = false;  // emit a row for each GroupItem itself?
    // Pattern: top layers whose names match this are treated as "categories"
    // and skipped over so their children become the effective Top Layer.
    // Defaults to /^artboard\s*\d+/i — i.e. children named "Artboard 1",
    // "Artboard 2"… mark a layer as a category wrapper.
    var ARTBOARD_LAYER_PATTERN = /^artboard\s*\d+/i;
    // ---------------------------------------------------------------------

    var doc = app.activeDocument;

    // =====================================================================
    // 1. Walk every page item
    // =====================================================================
    // entry: { item, type, category, topLayer, sublayerPath, parentOrder }
    var entries = [];

    function pushIfWanted(item, category, topLayer, sublayerPath, parentOrder) {
        try {
            if (!INCLUDE_HIDDEN && item.hidden) return;
            if (!INCLUDE_LOCKED && item.locked) return;
        } catch (e) {}
        entries.push({
            item: item,
            type: item.typename,
            category: category,
            topLayer: topLayer,
            sublayerPath: sublayerPath,
            parentOrder: parentOrder
        });
    }

    function walkContainer(container, category, topLayer, sublayerPath) {
        var items = container.pageItems;
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            var t = it.typename;
            if (t === "GroupItem") {
                if (EMIT_GROUP_ROWS) pushIfWanted(it, category, topLayer, sublayerPath, i);
                walkContainer(it, category, topLayer, sublayerPath);
            } else {
                pushIfWanted(it, category, topLayer, sublayerPath, i);
            }
        }
    }

    // Detect if a layer is a "category wrapper" — a layer whose direct
    // children include sublayers matching the artboard naming pattern.
    function isCategoryWrapper(layer) {
        if (!layer.layers || !layer.layers.length) return false;
        var matches = 0;
        for (var i = 0; i < layer.layers.length; i++) {
            if (ARTBOARD_LAYER_PATTERN.test(layer.layers[i].name)) matches++;
        }
        // Treat as a wrapper if at least one child looks like an artboard layer.
        return matches > 0;
    }

    function walkLayers(layers, category, topLayer, pathPrefix) {
        for (var i = 0; i < layers.length; i++) {
            var lyr = layers[i];
            if (!INCLUDE_HIDDEN && !lyr.visible) continue;

            // First pass: are we entering a category wrapper at the top?
            // (Only check while we haven't yet picked a topLayer.)
            if (!topLayer && isCategoryWrapper(lyr)) {
                // Descend, using this layer's name as the Category.
                walkLayers(lyr.layers, lyr.name, null, "");
                // Also walk any items directly on the wrapper (rare but possible).
                walkContainer(lyr, lyr.name, null, lyr.name);
                continue;
            }

            // If no top layer chosen yet, this layer becomes it.
            var top    = topLayer ? topLayer : lyr;
            var subPath = pathPrefix ? (pathPrefix + " > " + lyr.name) : lyr.name;
            var cat     = category || "";

            walkContainer(lyr, cat, top, subPath);

            if (lyr.layers && lyr.layers.length) {
                walkLayers(lyr.layers, cat, top, subPath);
            }
        }
    }

    walkLayers(doc.layers, "", null, "");

    if (entries.length === 0) {
        alert("No page items found.");
        return;
    }

    // =====================================================================
    // 2. Artboard hit-test
    // =====================================================================
    function frameCenter(item) {
        var b;
        try { b = item.visibleBounds; } catch (e) { return null; }
        return { x: (b[0] + b[2]) / 2, y: (b[1] + b[3]) / 2 };
    }

    function pointInArtboard(pt, ab) {
        var r = ab.artboardRect; // [left, top, right, bottom], y grows UP
        return pt.x >= r[0] && pt.x <= r[2] && pt.y <= r[1] && pt.y >= r[3];
    }

    function artboardForItem(item) {
        var c = frameCenter(item);
        if (!c) return { num: OUTSIDE_LABEL, name: "" };
        for (var i = 0; i < doc.artboards.length; i++) {
            if (pointInArtboard(c, doc.artboards[i])) {
                return { num: String(i + 1), name: doc.artboards[i].name };
            }
        }
        return { num: OUTSIDE_LABEL, name: "" };
    }

    // =====================================================================
    // 3. Per-type metadata extractors
    // =====================================================================
    function describeColor(c) {
        if (!c) return "None";
        var t = c.typename;
        switch (t) {
            case "CMYKColor":     return "CMYK";
            case "RGBColor":      return "RGB";
            case "GrayColor":     return "Gray";
            case "SpotColor":     return "Spot";
            case "GradientColor": return "Gradient";
            case "PatternColor":  return "Pattern";
            case "NoColor":       return "None";
            default:              return t.replace("Color", "");
        }
    }

    function rasterColorSpace(ri) {
        try {
            var s = String(ri.imageColorSpace);
            if (s.indexOf("CMYK") !== -1)        return "CMYK";
            if (s.indexOf("RGB") !== -1)         return "RGB";
            if (s.indexOf("GrayScale") !== -1 ||
                s.indexOf("Gray") !== -1)        return "Gray";
            if (s.indexOf("LAB") !== -1)         return "LAB";
            if (s.indexOf("Indexed") !== -1)     return "Indexed";
            return s.split(".").pop();
        } catch (e) { return "?"; }
    }

    function rasterEffectivePPI(ri) {
        // ri.HResolution is the original PPI. Effective PPI = original / current scale.
        try {
            if (typeof ri.HResolution !== "undefined" && ri.HResolution > 0) {
                var m = ri.matrix;
                var sx = Math.sqrt(m.mValueA * m.mValueA + m.mValueB * m.mValueB);
                if (sx > 0) return Math.round(ri.HResolution / sx);
            }
        } catch (e) {}
        return null;
    }

    function rasterPixelDims(ri) {
        // RasterItem doesn't expose pixel width/height directly. Derive
        // from boundingBox (in points) + HResolution/VResolution.
        try {
            var bb = ri.boundingBox; // [l, t, r, b], y grows UP
            var wPts = bb[2] - bb[0];
            var hPts = bb[1] - bb[3];
            var hres = ri.HResolution, vres = ri.VResolution;
            if (hres && vres) {
                return {
                    w: Math.round(wPts / 72 * hres),
                    h: Math.round(hPts / 72 * vres)
                };
            }
        } catch (e) {}
        return { w: null, h: null };
    }

    function fileSizeKB(file) {
        try { if (file && file.exists) return Math.round(file.length / 1024); }
        catch (e) {}
        return null;
    }

    function describeRaster(ri) {
        var info = { colorSpace: rasterColorSpace(ri),
                     linked: "", file: "", px: "", ppi: "", sizeKB: "" };
        var dims = rasterPixelDims(ri);
        var ppi  = rasterEffectivePPI(ri);
        if (dims.w && dims.h) info.px = dims.w + "×" + dims.h;
        if (ppi)              info.ppi = ppi + " ppi";

        try {
            if (ri.embedded) {
                info.linked = "Embedded";
                if (ri.file && ri.file.name) info.file = ri.file.name;
            } else if (ri.file) {
                info.linked = ri.file.exists ? "Linked" : "Linked (missing)";
                info.file   = ri.file.fsName;
                var kb = fileSizeKB(ri.file);
                if (kb !== null) info.sizeKB = kb;
            } else {
                info.linked = "Linked (no file ref)";
            }
        } catch (e) { info.linked = "?"; }

        return info;
    }

    function describePlaced(pi) {
        var info = { colorSpace: "?", linked: "Linked", file: "",
                     px: "", ppi: "", sizeKB: "" };
        try {
            if (pi.file) {
                info.file = pi.file.fsName;
                if (!pi.file.exists) info.linked = "Linked (missing)";
                var kb = fileSizeKB(pi.file);
                if (kb !== null) info.sizeKB = kb;
            }
        } catch (e) {}
        return info;
    }

    function describePath(p) {
        var fillCS = "None", strokeCS = "None";
        try { if (p.filled)  fillCS   = describeColor(p.fillColor);   } catch (e) {}
        try { if (p.stroked) strokeCS = describeColor(p.strokeColor); } catch (e) {}
        if (fillCS === strokeCS)   return { colorSpace: fillCS };
        if (fillCS === "None")     return { colorSpace: strokeCS };
        if (strokeCS === "None")   return { colorSpace: fillCS };
        return { colorSpace: fillCS + "/" + strokeCS };
    }

    function describeText(tf) {
        var cs = "?";
        try {
            if (tf.textRange && tf.textRange.characterAttributes) {
                cs = describeColor(tf.textRange.characterAttributes.fillColor);
            }
        } catch (e) {}
        return { colorSpace: cs };
    }

    // =====================================================================
    // 4. Build rows
    // =====================================================================
    function safeName(item)  { try { return item.name || ""; } catch (e) { return ""; } }
    function round2(n)       { return Math.round(n * 100) / 100; }

    function safeBounds(item) {
        try {
            var b = item.visibleBounds;
            return {
                x: round2(b[0]),
                y: round2(b[1]),
                w: round2(b[2] - b[0]),
                h: round2(b[1] - b[3])
            };
        } catch (e) { return { x: "", y: "", w: "", h: "" }; }
    }

    var rows = [];

    for (var i = 0; i < entries.length; i++) {
        var e  = entries[i];
        var it = e.item;
        var ab = artboardForItem(it);
        var bn = safeBounds(it);

        var row = {
            artboardNum:  ab.num,
            artboardName: ab.name,
            category:     e.category || "",
            topLayer:     e.topLayer ? e.topLayer.name : "",
            subPath:      e.sublayerPath,
            order:        e.parentOrder,
            type:         e.type,
            name:         safeName(it),
            content:      "",
            colorSpace:   "",
            linked:       "",
            filePath:     "",
            pixelDims:    "",
            ppi:          "",
            sizeKB:       "",
            x: bn.x, y: bn.y, w: bn.w, h: bn.h,
            hidden: (function(){ try { return it.hidden ? "Y" : ""; } catch(e){return "";} })(),
            locked: (function(){ try { return it.locked ? "Y" : ""; } catch(e){return "";} })()
        };

        switch (e.type) {
            case "TextFrame":
                try { row.content = it.contents || ""; } catch (er) {}
                row.colorSpace = describeText(it).colorSpace;
                break;

            case "RasterItem":
                var rinfo = describeRaster(it);
                row.content    = rinfo.file;
                row.colorSpace = rinfo.colorSpace;
                row.linked     = rinfo.linked;
                row.filePath   = rinfo.file;
                row.pixelDims  = rinfo.px;
                row.ppi        = rinfo.ppi;
                row.sizeKB     = rinfo.sizeKB;
                break;

            case "PlacedItem":
                var pinfo = describePlaced(it);
                row.content    = pinfo.file;
                row.colorSpace = pinfo.colorSpace;
                row.linked     = pinfo.linked;
                row.filePath   = pinfo.file;
                row.sizeKB     = pinfo.sizeKB;
                break;

            case "PathItem":
                row.colorSpace = describePath(it).colorSpace;
                break;

            case "CompoundPathItem":
                try {
                    if (it.pathItems && it.pathItems.length) {
                        row.colorSpace = describePath(it.pathItems[0]).colorSpace;
                    } else row.colorSpace = "?";
                } catch (er) { row.colorSpace = "?"; }
                break;

            case "SymbolItem":
                try { row.content = it.symbol ? it.symbol.name : ""; } catch (er) {}
                break;

            case "MeshItem":
                row.colorSpace = "Mesh";
                break;

            case "GraphItem":
                row.colorSpace = "Graph";
                break;

            case "GroupItem":
                // only emitted if EMIT_GROUP_ROWS = true
                break;

            case "PluginItem":
            default:
                // PluginItem covers live-effect groups, blends, envelope
                // distorts, etc. Their contents are not directly enumerable.
                break;
        }

        rows.push(row);
    }

    // =====================================================================
    // 5. Sort: Artboard # → Top Layer → Sublayer Path → z-order
    // =====================================================================
    rows.sort(function (a, b) {
        var na = parseInt(a.artboardNum, 10); if (isNaN(na)) na = 1e9;
        var nb = parseInt(b.artboardNum, 10); if (isNaN(nb)) nb = 1e9;
        if (na !== nb) return na - nb;
        if (a.topLayer !== b.topLayer) return a.topLayer < b.topLayer ? -1 : 1;
        if (a.subPath  !== b.subPath)  return a.subPath  < b.subPath  ? -1 : 1;
        return a.order - b.order;
    });

    // =====================================================================
    // 6. Write CSV
    // =====================================================================
    function csvEscape(s) {
        s = (s === null || s === undefined) ? "" : String(s);
        s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
        return s;
    }

    var headers = [
        "Artboard #", "Artboard Name", "Category", "Top Layer", "Sublayer Path",
        "Order", "Type", "Name", "Content / File", "Color Space",
        "Linked?", "File Path", "Pixel Dimensions", "PPI", "File Size (KB)",
        "X (pt)", "Y (pt)", "W (pt)", "H (pt)", "Hidden", "Locked"
    ];

    function rowToCsv(r) {
        var fields = [
            r.artboardNum, r.artboardName, r.category, r.topLayer, r.subPath,
            r.order, r.type, r.name, r.content, r.colorSpace,
            r.linked, r.filePath, r.pixelDims, r.ppi, r.sizeKB,
            r.x, r.y, r.w, r.h, r.hidden, r.locked
        ];
        var escaped = [];
        for (var f = 0; f < fields.length; f++) escaped.push(csvEscape(fields[f]));
        return escaped.join(",");
    }

    var lines = [headers.join(",")];
    for (var k = 0; k < rows.length; k++) {
        lines.push(rowToCsv(rows[k]));
    }
    var csv = lines.join("\r\n");

    // ---- Decide where to save ------------------------------------------
    var outFile;
    try {
        var docFile = doc.fullName;
        var base = docFile.name.replace(/\.[^.]+$/, "");
        outFile = new File(docFile.parent.fsName + "/" + base + "_items-by-artboard.csv");
    } catch (err) {
        outFile = new File(Folder.desktop.fsName + "/items-by-artboard.csv");
    }

    outFile.encoding = "UTF-8";
    outFile.open("w");
    outFile.write("\uFEFF" + csv);
    outFile.close();

    alert(
        "Done.\n\n" +
        rows.length + " items exported across " +
        doc.artboards.length + " artboard(s).\n\n" +
        "Saved to:\n" + outFile.fsName
    );
})();

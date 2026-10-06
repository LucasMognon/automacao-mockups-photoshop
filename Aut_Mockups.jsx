#target photoshop

/*
 * Decoreiro — automacao de individuais, duplas e trios, v2.0.0
 * Destino: Photoshop desktop 24.6 / ExtendScript (ES3).
 * Individual: u (ou 1) -> UNICO. Dupla: e -> DUPLA1; d -> DUPLA2.
 * Trio: e -> IMAGEM3; m -> IMAGEM 2; d -> IMAGEM1.
 * Os PSD/PSB e as imagens de entrada nunca sao salvos pelo script.
 * Ver LEIA-ME.html para limites, organizacao e primeiro teste.
 */
(function () {
    var VERSION = "2.0.0";
    var TYPES = [
        {id: "individuais", label: "Individual", map: ["UNICO"], letters: ["u"], hint: "u (ou 1) → UNICO"},
        {id: "duplas", label: "Dupla", map: ["DUPLA1", "DUPLA2"], letters: ["e", "d"], hint: "e (esquerda) → DUPLA1   |   d (direita) → DUPLA2"},
        {id: "trios", label: "Trio", map: ["IMAGEM3", "IMAGEM2", "IMAGEM1"], letters: ["e", "m", "d"], hint: "e → IMAGEM3   |   m → IMAGEM 2   |   d → IMAGEM1"}
    ];
    var TYPE = TYPES[2], MAP = TYPE.map, LETTERS = TYPE.letters;
    var PROFILE = "sRGB IEC61966-2.1";
    var cfg = null, work = null, panel = null, errors = [];
    var stopped = false, done = 0, skipped = 0, failed = 0, processed = 0;
    var oldDialogs = app.displayDialogs, oldUnits = app.preferences.rulerUnits;

    function s(v) { return stringIDToTypeID(v); }
    function c(v) { return charIDToTypeID(v); }
    function textName(f) { try { return decodeURI(f.name); } catch (_) { return f.name; } }
    function stem(f) { return textName(f).replace(/\.[^.]+$/, ""); }
    function normal(v) { return String(v).replace(/\.[^.]+$/, "").replace(/[\s_\-]/g, "").toUpperCase(); }
    function tidy(v) {
        v = String(v).replace(/[<>:"\/\\|?*\x00-\x1f]/g, "_").replace(/[.\s]+$/g, "");
        if (!v || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(v)) { v = "_" + v; }
        return v;
    }
    function pathKey(f) { return f.fsName.replace(/\\/g, "/").toLowerCase(); }
    function inside(a, b) { return pathKey(a) === pathKey(b) || pathKey(a).indexOf(pathKey(b) + "/") === 0; }
    function compare(a, b) {
        var x = textName(a).toLowerCase(), y = textName(b).toLowerCase();
        return x < y ? -1 : (x > y ? 1 : 0);
    }
    function makeFolder(f) {
        if (!f.exists && !f.create()) { throw new Error("Nao foi possivel criar a pasta: " + f.fsName); }
        return f;
    }
    function write(f, value) {
        f.encoding = "UTF-8"; f.lineFeed = "Windows";
        if (!f.open("w")) { throw new Error("Nao foi possivel gravar: " + f.fsName); }
        try { if (!f.write(value)) { throw new Error("Falha de gravacao: " + f.fsName); } }
        finally { f.close(); }
    }
    function read(f) {
        if (!f.exists) { return ""; }
        f.encoding = "UTF-8";
        if (!f.open("r")) { return ""; }
        var value = f.read(); f.close(); return value;
    }
    function stamp() {
        var d = new Date();
        function p(n) { return (n < 10 ? "0" : "") + n; }
        return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "_" +
            p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + "_" + d.getMilliseconds();
    }
    function setType(index) {
        TYPE = TYPES[index]; MAP = TYPE.map; LETTERS = TYPE.letters;
    }
    function recordError(message) {
        // Apenas na memoria para o resumo da tela. Nenhum relatorio e gravado.
        if (errors.length < 100) { errors.push(message); }
    }
    function errorText(e) {
        return String(e.message || e) + (e.number ? " [codigo " + e.number + "]" : "") +
            (e.line ? " [linha " + e.line + "]" : "");
    }
    function cancelCheck() {
        if (panel) { panel.update(); }
        if (stopped) { var e = new Error("Interrompido pelo usuario."); e.decoreiroCancel = true; throw e; }
    }
    function isCancel(e) { return !!e.decoreiroCancel || e.number === 8007; }
    function status(message) {
        if (panel) { panel.message.text = message; panel.bar.value = processed; panel.update(); }
        cancelCheck();
    }
    function closeDoc(doc) { if (doc) { doc.close(SaveOptions.DONOTSAVECHANGES); } }
    function cleanWork(folder) {
        // Apenas arquivos criados dentro da pasta temporaria exclusiva desta execucao.
        if (!folder || !folder.exists) { return; }
        var files = folder.getFiles();
        for (var i = 0; i < files.length; i++) {
            if (files[i] instanceof Folder) { cleanWork(files[i]); }
            else { files[i].remove(); }
        }
        folder.remove();
    }

    function findRoot(start) {
        var here = start;
        for (var i = 0; i < 5; i++) {
            if (new Folder(here.fsName + "/arquivos").exists) { return here; }
            if (pathKey(here.parent) === pathKey(here)) { break; }
            here = here.parent;
        }
        return null;
    }
    function typeFolder(base, type) {
        var nested = new Folder(base.fsName + "/" + type.id);
        return nested.exists ? nested : base;
    }
    function options() {
        var root = findRoot(new File($.fileName).parent);
        if (!root) {
            root = Folder.selectDialog("Escolha Decoreiro_Automacao_Photoshop (a pasta que contem arquivos).");
            if (!root) { return null; }
            if (textName(root).toLowerCase() === "arquivos") { root = root.parent; }
        }
        var base = new Folder(root.fsName + "/arquivos");
        var mockBase = new Folder(base.fsName + "/mockups");
        var imageBase = new Folder(base.fsName + "/imagens");
        var w = new Window("dialog", "Decoreiro — automacao de mockups v" + VERSION);
        w.orientation = "column"; w.alignChildren = "fill";
        var typeRow = w.add("group"); typeRow.add("statictext", undefined, "Tipo de produto:");
        var type = typeRow.add("dropdownlist", undefined, ["Individual", "Dupla", "Trio"]);
        type.selection = 2;
        var mapping = w.add("statictext", undefined, TYPE.hint);
        mapping.preferredSize.width = 700;
        function folderRow(label, folder) {
            var row = w.add("group"); row.add("statictext", undefined, label).preferredSize.width = 128;
            var field = row.add("edittext", undefined, folder.fsName); field.characters = 48;
            var button = row.add("button", undefined, "Escolher");
            button.onClick = function () {
                var chosen = Folder.selectDialog(label, new Folder(field.text));
                if (chosen) { field.text = chosen.fsName; }
            };
            return field;
        }
        var mocks = folderRow("Pasta dos mockups", typeFolder(mockBase, TYPE));
        var images = folderRow("Pasta das imagens", typeFolder(imageBase, TYPE));
        var links = folderRow("Objetos vinculados", new Folder(base.fsName + "/objetos_vinculados"));
        var output = folderRow("Salvar resultados em", new Folder(base.fsName + "/Resultados"));
        type.onChange = function () {
            setType(type.selection.index);
            mapping.text = TYPE.hint;
            mocks.text = typeFolder(mockBase, TYPE).fsName;
            images.text = typeFolder(imageBase, TYPE).fsName;
        };
        w.add("statictext", undefined, "Subpastas opcionais: individuais, duplas e trios (em imagens e mockups).");
        var fitRow = w.add("group"); fitRow.add("statictext", undefined, "Enquadramento:");
        var fit = fitRow.add("dropdownlist", undefined, [
            "Esticar para preencher — centralizado, sem corte (padrao)",
            "Preencher o quadro — corte central, sem distorcer",
            "Mostrar a arte inteira — bordas brancas se necessario"
        ]); fit.selection = 0;
        var modeRow = w.add("group"); modeRow.add("statictext", undefined, "Execucao:");
        var mode = modeRow.add("dropdownlist", undefined, [
            "Teste: primeiro conjunto no primeiro mockup",
            "Lote completo: todos os conjuntos e mockups"
        ]); mode.selection = 0;
        w.add("statictext", undefined, "JPG qualidade 10/12, sRGB, dimensoes do mockup. Originais preservados.");
        w.add("statictext", undefined, "Saida: Resultados / tipo / produto / mockup.jpg. Resumo somente na tela.");
        var buttons = w.add("group"); buttons.alignment = "right";
        buttons.add("button", undefined, "Cancelar", {name: "cancel"});
        buttons.add("button", undefined, "Iniciar", {name: "ok"});
        if (w.show() !== 1) { return null; }
        setType(type.selection.index);
        return {mocks: new Folder(mocks.text), images: new Folder(images.text),
            links: new Folder(links.text), output: new Folder(output.text),
            fit: ["stretch", "cover", "contain"][fit.selection.index], test: mode.selection.index === 0};
    }

    function productSet(folder) {
        var list = folder.getFiles(), files = [], found = 0, extra = [];
        for (var i = 0; i < list.length; i++) {
            var f = list[i];
            if (!(f instanceof File)) { continue; }
            var letter = stem(f).toLowerCase();
            if (!/^(e|m|d|u|1)$/.test(letter)) { continue; }
            if (TYPE.id === "individuais" && letter === "1") { letter = "u"; }
            var n = -1;
            for (var k = 0; k < LETTERS.length; k++) { if (letter === LETTERS[k]) { n = k; break; } }
            if (n < 0) { extra.push(textName(f)); continue; }
            if (!/\.(jpe?g|png|tiff?)$/i.test(f.name)) {
                throw new Error("Formato nao aceito: " + f.fsName + ". Use JPG, PNG ou TIFF. PDF precisa ser convertido antes.");
            }
            if (files[n]) { throw new Error("Duas imagens para a posicao " + LETTERS[n] + " em " + folder.fsName); }
            files[n] = f; found++;
        }
        if (!found && !extra.length) { return null; }
        if (extra.length) {
            throw new Error("A pasta " + folder.fsName + " tem imagens de outro tipo (" + extra.join(", ") +
                "). Para " + TYPE.label + ", use " + LETTERS.join(", ") + ". Separe os tipos em pastas.");
        }
        if (found !== LETTERS.length) {
            throw new Error("Conjunto incompleto em " + folder.fsName + ". Para " + TYPE.label + ", use " + LETTERS.join(", ") + ".");
        }
        return {name: tidy(textName(folder)), folder: folder, files: files};
    }
    function getProducts(root) {
        var result = [], direct = productSet(root), folders = root.getFiles();
        if (direct) { result.push(direct); }
        folders.sort(compare);
        for (var i = 0; i < folders.length; i++) {
            if (folders[i] instanceof Folder) {
                var item = productSet(folders[i]); if (item) { result.push(item); }
            }
        }
        if (!result.length) { throw new Error("Nenhum produto encontrado. Para " + TYPE.label + ", use " + LETTERS.join(", ") + " como nomes das imagens, na pasta ou em subpastas de produtos."); }
        uniqueNames(result, "conjuntos"); return result;
    }
    function uniqueNames(items, label) {
        var seen = {};
        for (var i = 0; i < items.length; i++) {
            var key = "$" + items[i].name.toLowerCase();
            if (seen[key]) { throw new Error("Nomes de " + label + " repetidos na saida: " + items[i].name); }
            seen[key] = true;
        }
    }
    function getMocks(root) {
        var files = root.getFiles(), result = []; files.sort(compare);
        for (var i = 0; i < files.length; i++) {
            if (files[i] instanceof File && /\.(psd|psb)$/i.test(files[i].name)) {
                result.push({file: files[i], name: tidy(stem(files[i]))});
            }
        }
        if (!result.length) { throw new Error("Nenhum PSD/PSB diretamente na pasta dos mockups."); }
        uniqueNames(result, "mockups"); return result;
    }
    function getSources(root) {
        var files = root.getFiles(), result = [];
        for (var i = 0; i < files.length; i++) {
            if (!(files[i] instanceof File) || !/\.(psd|psb)$/i.test(files[i].name)) { continue; }
            for (var n = 0; n < MAP.length; n++) {
                if (normal(stem(files[i])) === MAP[n]) {
                    if (result[n]) { throw new Error("Mais de um arquivo vinculado chamado " + MAP[n]); }
                    result[n] = files[i];
                }
            }
        }
        for (var k = 0; k < MAP.length; k++) {
            if (!result[k]) { throw new Error("Arquivo " + MAP[k] + ".psb nao encontrado na pasta de objetos vinculados."); }
        }
        return result;
    }
    function fileMark(f) {
        var current = new File(f.fsName);
        return encodeURIComponent(current.fsName) + ":" + current.length + ":" +
            (current.modified ? current.modified.getTime() : "?");
    }
    function signature(product, mock, sources) {
        var pieces = [VERSION, TYPE.id, cfg.fit, "jpeg10-srgb", fileMark(mock.file)];
        for (var i = 0; i < MAP.length; i++) { pieces.push(fileMark(product.files[i])); pieces.push(fileMark(sources[i])); }
        return pieces.join("|");
    }
    function paths(product, mock) {
        var base = makeFolder(new Folder(cfg.output.fsName + "/" + TYPE.id));
        var folder = makeFolder(new Folder(base.fsName + "/" + product.name));
        var controls = makeFolder(new Folder(cfg.output.fsName + "/_controle"));
        controls = makeFolder(new Folder(controls.fsName + "/" + TYPE.id));
        controls = makeFolder(new Folder(controls.fsName + "/" + product.name));
        return {jpg: new File(folder.fsName + "/" + mock.name + ".jpg"),
            receipt: new File(controls.fsName + "/" + mock.name + ".txt")};
    }
    function completed(p, sig) {
        if (!p.jpg.exists) { return false; }
        if (p.jpg.length > 0 && read(p.receipt).replace(/\r/g, "") === sig + "\n" + p.jpg.length) { return true; }
        throw new Error("Ja existe outro resultado em " + p.jpg.fsName +
            ". Escolha outra pasta de saida ou retire esse JPG antes de repetir. Nenhum arquivo foi substituido.");
    }

    function sourceSpecs(sources) {
        var specs = [];
        for (var i = 0; i < MAP.length; i++) {
            status("Lendo as dimensoes de " + textName(sources[i]));
            var doc = null;
            try {
                doc = app.open(sources[i]);
                specs.push({width: doc.width.as("px"), height: doc.height.as("px"), resolution: doc.resolution});
            } finally { closeDoc(doc); }
        }
        return specs;
    }
    function descriptor(layer) {
        var ref = new ActionReference(); ref.putIdentifier(c("Lyr "), layer.id);
        return executeActionGet(ref);
    }
    function numberValue(desc, key) {
        var id = s(key), t = desc.getType(id);
        if (t === DescValueType.UNITDOUBLE) { return desc.getUnitDoubleValue(id); }
        if (t === DescValueType.INTEGERTYPE) { return desc.getInteger(id); }
        return desc.getDouble(id);
    }
    function geometry(desc) {
        var more = desc.getObjectValue(s("smartObjectMore"));
        var size = more.getObjectValue(s("size"));
        var key = more.hasKey(s("nonAffineTransform")) ? "nonAffineTransform" : "transform";
        var list = more.getList(s(key)), corners = [];
        for (var i = 0; i < list.count; i++) { corners.push(list.getDouble(i)); }
        if (corners.length !== 8) { throw new Error("Nao foi possivel ler os quatro cantos do objeto inteligente."); }
        return {width: numberValue(size, "width"), height: numberValue(size, "height"),
            resolution: numberValue(more, "resolution"), corners: corners};
    }
    function basename(path) {
        path = String(path).replace(/\\/g, "/");
        try { path = decodeURI(path); } catch (_) {}
        return path.substring(path.lastIndexOf("/") + 1);
    }
    function slotFor(layer, desc) {
        var so = desc.getObjectValue(s("smartObject")), candidate = "";
        if (so.hasKey(s("fileReference"))) { candidate = normal(basename(so.getString(s("fileReference")))); }
        for (var i = 0; i < MAP.length; i++) { if (candidate === MAP[i]) { return i; } }
        // Nome de camada apenas como alternativa; o vinculo tem prioridade.
        candidate = normal(layer.name);
        for (var j = 0; j < MAP.length; j++) { if (candidate === MAP[j]) { return j; } }
        return -1;
    }
    function collect(doc, specs) {
        var result = [];
        function visit(parent) {
            for (var i = 0; i < parent.layers.length; i++) {
                var layer = parent.layers[i];
                if (layer.typename === "LayerSet") { visit(layer); continue; }
                if (layer.kind !== LayerKind.SMARTOBJECT) { continue; }
                var desc = descriptor(layer), slot = slotFor(layer, desc);
                if (slot < 0) { continue; }
                if (result[slot]) { throw new Error("Mais de uma camada corresponde a " + MAP[slot] + ". Este modelo precisa de ajuste."); }
                var so = desc.getObjectValue(s("smartObject"));
                if (!so.hasKey(s("linked")) || !so.getBoolean(s("linked"))) {
                    throw new Error("A camada " + layer.name + " nao e um objeto inteligente vinculado.");
                }
                var geo = geometry(desc), spec = specs[slot];
                if (Math.abs(geo.width - spec.width) > 0.1 || Math.abs(geo.height - spec.height) > 0.1 ||
                    Math.abs(geo.resolution - spec.resolution) > 0.1) {
                    throw new Error("O objeto " + layer.name + " usa dimensoes/ppi diferentes do arquivo vinculado selecionado. " +
                        "Execute esse modelo separadamente com seus proprios arquivos vinculados.");
                }
                result[slot] = {layer: layer, before: geo};
            }
        }
        visit(doc);
        for (var n = 0; n < MAP.length; n++) {
            if (!result[n]) { throw new Error("Nao encontrei o objeto " + MAP[n] + " no mockup " + doc.name); }
        }
        return result;
    }
    function fitSize(w, h, tw, th, fit) {
        // Cada eixo usa a dimensao do respectivo objeto; deformacao interna autorizada.
        if (fit === "stretch") { return {width: tw, height: th}; }
        var scale = fit === "cover" ? Math.max(tw / w, th / h) : Math.min(tw / w, th / h);
        return {width: fit === "cover" ? Math.ceil(w * scale) : Math.max(1, Math.round(w * scale)),
            height: fit === "cover" ? Math.ceil(h * scale) : Math.max(1, Math.round(h * scale))};
    }
    function makeArt(file, spec, output) {
        var art = null, target = null;
        try {
            cancelCheck();
            art = app.open(file);
            if (art.mode !== DocumentMode.RGB) { art.changeMode(ChangeMode.RGB); }
            art.bitsPerChannel = BitsPerChannelType.EIGHT;
            art.convertProfile(PROFILE, Intent.RELATIVECOLORIMETRIC, true, true);
            art.flatten();
            var size = fitSize(art.width.as("px"), art.height.as("px"), spec.width, spec.height, cfg.fit);
            art.resizeImage(UnitValue(size.width, "px"), UnitValue(size.height, "px"), spec.resolution, ResampleMethod.BICUBIC);
            if (cfg.fit === "stretch" && (Math.abs(art.width.as("px") - spec.width) > 0.5 ||
                Math.abs(art.height.as("px") - spec.height) > 0.5)) {
                throw new Error("O Photoshop nao aplicou a largura e a altura independentes da arte.");
            }
            target = app.documents.add(UnitValue(spec.width, "px"), UnitValue(spec.height, "px"),
                spec.resolution, "Decoreiro_arte_temporaria", NewDocumentMode.RGB, DocumentFill.WHITE,
                1, BitsPerChannelType.EIGHT, PROFILE);
            app.activeDocument = art;
            var pasted = art.activeLayer.duplicate(target, ElementPlacement.PLACEATBEGINNING);
            closeDoc(art); art = null;
            app.activeDocument = target;
            if (pasted.isBackgroundLayer) { pasted.isBackgroundLayer = false; }
            pasted.allLocked = false;
            var b = pasted.bounds;
            pasted.translate(UnitValue((spec.width - (b[2].as("px") - b[0].as("px"))) / 2 - b[0].as("px"), "px"),
                UnitValue((spec.height - (b[3].as("px") - b[1].as("px"))) / 2 - b[1].as("px"), "px"));
            target.flatten();
            var psdOptions = new PhotoshopSaveOptions();
            psdOptions.layers = false; psdOptions.embedColorProfile = true;
            target.saveAs(output, psdOptions, true, Extension.LOWERCASE);
            if (!output.exists || !output.length) { throw new Error("A arte temporaria nao foi gravada."); }
        } finally { closeDoc(art); closeDoc(target); }
    }
    function relink(doc, entry, file) {
        cancelCheck(); app.activeDocument = doc; doc.activeLayer = entry.layer;
        if (entry.layer.allLocked) { entry.layer.allLocked = false; }
        var action = new ActionDescriptor(); action.putPath(c("null"), file);
        executeAction(s("placedLayerRelinkToFile"), action, DialogModes.NO);
        var current = descriptor(entry.layer), after = geometry(current), before = entry.before;
        for (var i = 0; i < 8; i++) {
            if (Math.abs(before.corners[i] - after.corners[i]) > 0.25) {
                throw new Error("A troca alterou a perspectiva da camada " + entry.layer.name + ". Exportacao interrompida.");
            }
        }
        var so = current.getObjectValue(s("smartObject"));
        if (!so.hasKey(s("link")) || pathKey(so.getPath(s("link"))) !== pathKey(file)) {
            throw new Error("Nao foi possivel confirmar o novo vinculo de " + entry.layer.name);
        }
    }
    function exportJpg(doc, file) {
        var copy = null, temporary = new File(file.parent.fsName + "/_gravando_" + stamp() + ".jpg");
        try {
            cancelCheck(); app.activeDocument = doc;
            copy = doc.duplicate("Decoreiro_exportacao", true);
            if (copy.mode !== DocumentMode.RGB) { copy.changeMode(ChangeMode.RGB); }
            copy.bitsPerChannel = BitsPerChannelType.EIGHT;
            copy.convertProfile(PROFILE, Intent.RELATIVECOLORIMETRIC, true, true);
            copy.flatten();
            var opts = new JPEGSaveOptions(); opts.quality = 10;
            opts.embedColorProfile = true; opts.formatOptions = FormatOptions.STANDARDBASELINE;
            opts.matte = MatteType.WHITE;
            copy.saveAs(temporary, opts, true, Extension.LOWERCASE);
            closeDoc(copy); copy = null;
            if (!temporary.exists || !temporary.length) { throw new Error("JPG nao foi gravado."); }
            if (file.exists) { throw new Error("Arquivo de destino ja existe: " + file.fsName); }
            if (!temporary.rename(file.name)) { throw new Error("Nao foi possivel finalizar o JPG: " + file.fsName); }
        } finally {
            closeDoc(copy);
            // rename altera o proprio objeto File; nunca remover o JPG final.
            if (temporary.exists && /^_gravando_/.test(temporary.name)) { temporary.remove(); }
        }
    }
    function progress(total) {
        var w = new Window("palette", "Decoreiro — processamento"); w.orientation = "column";
        w.alignChildren = "fill";
        w.message = w.add("statictext", undefined, "Preparando..."); w.message.preferredSize.width = 610;
        w.bar = w.add("progressbar", undefined, 0, total); w.bar.preferredSize.height = 18;
        var stop = w.add("button", undefined, "Parar apos a operacao atual");
        stop.onClick = function () { stopped = true; stop.enabled = false; };
        w.onClose = function () { stopped = true; return true; };
        w.show(); return w;
    }

    function showSummary() {
        var message = (stopped ? "Processamento interrompido." : "Processamento encerrado.") +
            "\n\nTipo: " + TYPE.label + "\nGerados: " + done + "\nJa concluidos: " + skipped + "\nErros: " + failed +
            "\n\nResultados: " + cfg.output.fsName + "/" + TYPE.id +
            (cfg.test && done > 0 ? "\n\nConfira o JPG. Para processar tudo, execute novamente e escolha Lote completo." : "");
        if (!errors.length) { alert(message); return; }
        var w = new Window("dialog", "Decoreiro — resultado");
        w.orientation = "column"; w.alignChildren = "fill";
        var summary = w.add("statictext", undefined, message, {multiline: true});
        summary.preferredSize = [680, 220];
        var detail = w.add("edittext", undefined, errors.join("\n\n") +
            (failed > errors.length ? "\n\nMostrando os primeiros " + errors.length + " erros." : ""),
            {multiline: true, scrolling: true, readonly: true});
        detail.preferredSize = [680, 240];
        w.add("button", undefined, "Fechar", {name: "ok"});
        w.show();
    }

    try {
        if (app.documents.length) {
            alert("Antes de iniciar, salve e feche os documentos abertos no Photoshop.\nO script abrira os arquivos de que precisa automaticamente.");
            return;
        }
        cfg = options(); if (!cfg) { return; }
        if (!cfg.mocks.exists || !cfg.images.exists || !cfg.links.exists) {
            throw new Error("Confira as tres pastas de entrada. Alguma delas nao existe.");
        }
        if (inside(cfg.output, cfg.images) || inside(cfg.images, cfg.output) ||
            inside(cfg.output, cfg.links) || inside(cfg.links, cfg.output) || inside(cfg.mocks, cfg.output)) {
            throw new Error("Use uma pasta de saida separada das imagens e dos objetos vinculados, por exemplo Decoreiro_Automacao_Photoshop/arquivos/Resultados.");
        }
        var products = getProducts(cfg.images), mocks = getMocks(cfg.mocks), sources = getSources(cfg.links);
        if (cfg.test) { products = [products[0]]; mocks = [mocks[0]]; }
        makeFolder(cfg.output);
        work = makeFolder(new Folder(Folder.temp.fsName + "/Decoreiro_" + stamp()));
        panel = progress(products.length * mocks.length);
        app.displayDialogs = DialogModes.NO; app.preferences.rulerUnits = Units.PIXELS;
        var specs = sourceSpecs(sources);
        for (var m = 0; m < mocks.length; m++) {
            var mock = mocks[m], doc = null, baseline = null, entries = null;
            try {
                status("Abrindo " + textName(mock.file));
                doc = app.open(mock.file);
                entries = collect(doc, specs); baseline = doc.activeHistoryState;
                for (var n = 0; n < products.length; n++) {
                    var product = products[n], tempFiles = [], touched = false;
                    try {
                        status("[" + (processed + 1) + "/" + (products.length * mocks.length) + "] " + product.name + " — " + mock.name);
                        var out = paths(product, mock), sig = signature(product, mock, sources);
                        if (completed(out, sig)) {
                            skipped++; continue;
                        }
                        for (var k = 0; k < MAP.length; k++) {
                            status(product.name + " — preparando arte " + LETTERS[k]);
                            var tempFile = new File(work.fsName + "/m" + m + "_p" + n + "_arte" + (k + 1) + ".psd");
                            tempFiles.push(tempFile); makeArt(product.files[k], specs[k], tempFile);
                        }
                        for (var j = 0; j < MAP.length; j++) {
                            status(product.name + " — inserindo arte " + LETTERS[j]);
                            touched = true; relink(doc, entries[j], tempFiles[j]);
                        }
                        status(product.name + " — salvando " + mock.name + ".jpg");
                        exportJpg(doc, out.jpg);
                        write(out.receipt, sig + "\n" + new File(out.jpg.fsName).length);
                        done++;
                    } catch (itemError) {
                        if (isCancel(itemError)) { throw itemError; }
                        failed++; recordError("ERRO " + product.name + " / " + mock.name + ": " + errorText(itemError));
                    } finally {
                        if (touched) {
                            // Retorna ao modelo original em memoria e descarta as alteracoes futuras no proximo ciclo.
                            app.activeDocument = doc; doc.activeHistoryState = baseline;
                            // Nenhum documento do usuario estava aberto ao iniciar.
                            // Evita acumular historico de centenas de imagens na RAM.
                            app.purge(PurgeTarget.HISTORYCACHES); baseline = doc.activeHistoryState;
                        }
                        for (var t = 0; t < tempFiles.length; t++) { if (tempFiles[t].exists) { tempFiles[t].remove(); } }
                        processed++; if (panel) { panel.bar.value = processed; panel.update(); }
                        if (typeof $ !== "undefined" && $.gc) { $.gc(); }
                    }
                }
            } catch (mockError) {
                if (isCancel(mockError)) { throw mockError; }
                failed++; recordError("ERRO NO MOCKUP " + mock.name + ": " + errorText(mockError));
            } finally { closeDoc(doc); }
        }
    } catch (fatal) {
        stopped = isCancel(fatal);
        if (!stopped) { failed++; }
        if (!stopped) { recordError(errorText(fatal)); }
        if (!cfg && !stopped) { alert("Decoreiro: " + errorText(fatal)); }
    } finally {
        app.displayDialogs = oldDialogs; app.preferences.rulerUnits = oldUnits;
        if (panel) { panel.onClose = null; panel.close(); }
        cleanWork(work);
    }
    if (cfg) { showSummary(); }
}());

// ==============================================
// LAYOUT ENGINE - CONFIGURACIÓN COMPLETA PARA WORD
// ==============================================

export const PAGE_LAYOUT = {
    page: {
        size: 'A4',
        orientation: 'portrait',
        width: 595.28,
        height: 841.89,
    },
    margins: {
        top: 62.1,
        bottom: 56.69,
        left: 58.12,
        right: 56.98,
    },
    header: {
        distance: 25.5,
        text: 'SECRETO',
        font: 'Arial',
        size: 16,
        color: 'FF0000',
        letterSpacing: 3,
    },
    footer: {
        distance: 45.35,
        font: 'Arial',
        size: 11,
        color: '000000',
    },
    paragraph: {
        spacingBefore: 0,
        spacingAfter: 0,
        lineSpacing: 1.15,
    },
    fonts: {
        main: 'Arial',
        size: 11, // Tamaño base para todo el documento
        secretSize: 16,
    },
    indentations: {
        // Niveles de indentación según el HTML
        nivel0: 0,
        nivel1: 14.17,   // I., II., III.
        nivel2: 28.35,   // A., B., C.
        nivel3: 42.3,    // 1., 2., 3.
        nivel4: 52.9,    // a), b), c) - items
        nivel5: 60,      // sub-items con viñetas
        nivel6: 67.05,   // items de tareas específicas
        nivel7: 74.15,   // sub-items de tareas específicas
        nivel8: 88,      // sub-sub-items
        // Indentaciones específicas
        encabezadoLeft: 340.2,
        asuntoLeft: 72,
        asuntoHanging: -69,
        docsLeft: 63.8,
        textoIndent: 27.2,
        misionIndent: 28.35,
        conceptoIndent: 49.65,
        anexoIndent: 70.9,
        nominaIndent: 92,
    }
};

export class UnitConverter {
    static ptToEmu(pt) { return Math.round(pt * 12700); }
    static ptToTwips(pt) { return Math.round(pt * 20); }
    static cmToPt(cm) { return cm * 28.3464567; }
    static ptToCm(pt) { return pt * 0.0352777778; }
    static mmToPt(mm) { return mm * 2.83464567; }
    static ptToMm(pt) { return pt * 0.352777778; }
    static inToPt(inches) { return inches * 72; }
    static pxToPt(px) { return px * 0.75; }
    static parseCSSValue(value) {
        if (!value) return 0;
        const str = String(value).trim();
        if (str.endsWith('pt')) return parseFloat(str);
        if (str.endsWith('cm')) return this.cmToPt(parseFloat(str));
        if (str.endsWith('mm')) return this.mmToPt(parseFloat(str));
        if (str.endsWith('px')) return this.pxToPt(parseFloat(str));
        if (str.endsWith('in')) return this.inToPt(parseFloat(str));
        return parseFloat(str) || 0;
    }
}

export class LayoutCalculator {
    static getPageConfig() {
        const { page, margins, header, footer } = PAGE_LAYOUT;
        return {
            size: {
                width: UnitConverter.ptToTwips(page.width),
                height: UnitConverter.ptToTwips(page.height),
            },
            margins: {
                top: UnitConverter.ptToTwips(margins.top),
                bottom: UnitConverter.ptToTwips(margins.bottom),
                left: UnitConverter.ptToTwips(margins.left),
                right: UnitConverter.ptToTwips(margins.right),
            },
            header: { distance: UnitConverter.ptToTwips(header.distance) },
            footer: { distance: UnitConverter.ptToTwips(footer.distance) },
        };
    }

    static getMarginsCSS() {
        const { margins } = PAGE_LAYOUT;
        return {
            top: UnitConverter.ptToCm(margins.top),
            bottom: UnitConverter.ptToCm(margins.bottom),
            left: UnitConverter.ptToCm(margins.left),
            right: UnitConverter.ptToCm(margins.right),
        };
    }

    /**
     * Obtiene la indentación según el nivel detectado en la clase
     */
    static getIndentation(className = '') {
        const ind = PAGE_LAYOUT.indentations;
        let left = 0;
        let hanging = 0;
        let firstLine = 0;

        // Mapeo de clases a indentaciones
        const map = {
            // Nivel 1: Títulos romanos
            'titulo-romano': { left: ind.nivel1 },
            'titulo-romano-2': { left: ind.nivel1 },
            // Nivel 2: Letras mayúsculas
            'titulo-letra': { left: ind.nivel2 },
            'titulo-letra-11': { left: ind.nivel2 },
            // Nivel 3: Números
            'titulo-num': { left: ind.nivel3 },
            // Nivel 4: Items con letras
            'item-letra': { left: ind.nivel5 },
            'item-letra-85': { left: ind.nivel6 },
            'item-letra-71': { left: ind.nivel4 },
            'item-letra-92': { left: ind.nivel7 },
            // Nivel 5: Viñetas
            'item-vineta-99': { left: ind.nivel7 },
            'item-vineta-106': { left: ind.nivel8 },
            // Nivel 6: Textos específicos
            'item-num-71': { left: ind.nivel4 },
            'texto-situacion': { left: ind.textoIndent },
            'texto-situacion-2': { left: ind.textoIndent },
            'texto-mision': { left: ind.misionIndent },
            'texto-concepto': { left: ind.conceptoIndent },
            'texto-indentado-70': { left: ind.anexoIndent },
            'parrafo-asunto': { left: ind.asuntoLeft, hanging: ind.asuntoHanging },
            'parrafo-doc-titulo': { left: 5.8 },
            'item-docs': { left: ind.docsLeft },
            'bloque-encabezado': { left: ind.encabezadoLeft },
            'linea-encabezado': { left: ind.encabezadoLeft },
            'anexo-nomina': { left: ind.anexoIndent },
            'encabezado-secundario': { left: 0 },
        };

        for (const [cls, config] of Object.entries(map)) {
            if (className.includes(cls)) {
                left = config.left || 0;
                hanging = config.hanging || 0;
                if (hanging < 0) {
                    firstLine = hanging;
                    hanging = 0;
                }
                break;
            }
        }

        return {
            left: UnitConverter.ptToTwips(left),
            hanging: UnitConverter.ptToTwips(hanging),
            firstLine: UnitConverter.ptToTwips(firstLine),
        };
    }

    static getParagraphSpacing(className = '') {
        let after = 0;
        let before = 0;

        // Espaciado según tipo de elemento
        if (className.includes('titulo-romano') || className.includes('titulo-letra') || className.includes('titulo-num')) {
            after = 4;
        } else if (className.includes('item-letra') || className.includes('item-vineta') || className.includes('item-num')) {
            after = 0;
        } else if (className.includes('texto-')) {
            after = 2;
        } else if (className.includes('parrafo-')) {
            after = 2;
        } else if (className.includes('firma')) {
            after = 2;
        } else if (className.includes('vacio')) {
            after = 2;
            before = 0;
        } else {
            after = 2;
        }

        return {
            before: UnitConverter.ptToTwips(before),
            after: UnitConverter.ptToTwips(after),
            line: PAGE_LAYOUT.paragraph.lineSpacing,
        };
    }

    static getFontStyle(className = '') {
        const baseSize = PAGE_LAYOUT.fonts.size;
        let size = baseSize;
        let bold = false;
        let underline = false;
        let italic = false;

        // Tamaños específicos
        if (className.includes('fs-9')) size = 9;
        else if (className.includes('fs-10')) size = 10;
        else if (className.includes('fs-11')) size = 11;
        else if (className.includes('fs-13')) size = 13;
        else if (className.includes('fs-15')) size = 15;
        else if (className.includes('fs-16')) size = 16;
        else if (className.includes('texto-secreto')) size = 16;

        // Negritas
        if (className.includes('fw-bold') || className.includes('titulo-') || 
            className.includes('firma') || className.includes('marcador') ||
            className.includes('label') || className.includes('doc-label') ||
            className.includes('asunto-label') || className.includes('texto-secreto')) {
            bold = true;
        }

        // Subrayado
        if (className.includes('titulo-documento') || className.includes('underline')) {
            underline = true;
        }

        return { size, bold, underline, italic, font: PAGE_LAYOUT.fonts.main };
    }

    static getAlignment(className = '') {
        if (className.includes('text-center') || className.includes('center') ||
            className.includes('titulo-documento') || className.includes('firma-nombre') ||
            className.includes('firma-grado') || className.includes('firma-cargo') ||
            className.includes('numeracion') || className.includes('texto-secreto')) {
            return 'center';
        }
        if (className.includes('text-right') || className.includes('right') ||
            className.includes('bloque-encabezado') || className.includes('encabezado-secundario')) {
            return 'right';
        }
        if (className.includes('text-justify') || className.includes('justify') ||
            className.includes('texto-') || className.includes('parrafo-') ||
            className.includes('item-') || className.includes('firma')) {
            return 'both';
        }
        return 'left';
    }
}

export class StyleGenerator {
    static generateParagraphStyle(className = '') {
        return {
            alignment: LayoutCalculator.getAlignment(className),
            spacing: LayoutCalculator.getParagraphSpacing(className),
            indent: LayoutCalculator.getIndentation(className),
            font: LayoutCalculator.getFontStyle(className),
        };
    }

    static generateTableStyle(className = '') {
        return {
            widths: [25, 35, 20, 20],
            border: { style: 'single', size: 1, color: '000000' },
            cellPadding: 2,
            cellSpacing: 0,
        };
    }

    static getHeaderCSS() {
        const h = PAGE_LAYOUT.header;
        return {
            font: h.font,
            size: h.size,
            color: h.color,
            letterSpacing: h.letterSpacing,
            distance: UnitConverter.ptToCm(h.distance),
        };
    }

    static getFooterCSS() {
        const f = PAGE_LAYOUT.footer;
        const h = PAGE_LAYOUT.header;
        return {
            font: f.font,
            size: f.size,
            color: f.color,
            distance: UnitConverter.ptToCm(f.distance),
            secret: {
                font: h.font,
                size: h.size,
                color: h.color,
                letterSpacing: h.letterSpacing,
            }
        };
    }
}

export default {
    PAGE_LAYOUT,
    UnitConverter,
    LayoutCalculator,
    StyleGenerator,
};
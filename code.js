// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.
// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (see documentation).
// This shows the HTML page in "ui.html".
figma.showUI(__html__);
// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = msg => {
    // One way of distinguishing between different types of messages sent from
    // your HTML page is to use an object with a "type" property like this.
    const allPaintStyles = figma.getLocalPaintStyles();
    let themeList = [];
    let themeNameList = [];
    let sysLinks = [];
    function GetAllThemes() {
        allPaintStyles.forEach(style => {
            if (style.name.startsWith("[")) {
                // 是主题样式
                const themeName = style.name.split("]")[0].split("[")[1];
                if (!themeNameList.find(name => name == themeName))
                    themeNameList.push(themeName);
            }
        });
        for (let i = 0; i < themeNameList.length; i++) {
            const currentThemeStyle = allPaintStyles.filter(style => style.name.includes(themeNameList[i]));
            const newTheme = {
                name: themeNameList[i],
                styles: currentThemeStyle
            };
            themeList.push(newTheme);
        }
    }
    function GetAllLinks() {
        const defaultPaintStyles = allPaintStyles.filter(style => style.name.startsWith('[default]'));
        const RefPaintStyles = defaultPaintStyles.filter(style => style.name.startsWith('[default]/ref'));
        const SysPaintStyles = defaultPaintStyles.filter(style => style.name.startsWith('[default]/sys'));
        const universePaintStyles = allPaintStyles.filter(style => style.name.startsWith('universe'));
        SysPaintStyles.forEach(sys => {
            const newLink = {
                sysName: sys.name.split("]/")[1],
                linkPaints: []
            };
            sys.paints.forEach((sysPaint, i) => {
                const newLinkPaint = {
                    isDynamic: true
                };
                const refStyle = RefPaintStyles.find(ref => ComparePaints(sysPaint, ref.paints[i]));
                if (refStyle == null) {
                    newLinkPaint.isDynamic = false;
                    // const universeStyle = universePaintStyles.find(universe => ComparePaints(sysPaint, universe.paints[i]))
                    // if (universeStyle != null)
                    newLinkPaint.paint = sysPaint;
                }
                else {
                    newLinkPaint.refName = refStyle.name.split("]/")[1];
                }
                if (newLinkPaint.refName || newLinkPaint.paint) {
                    newLink.linkPaints.push(newLinkPaint);
                }
            });
            if (newLink.linkPaints)
                sysLinks.push(newLink);
        });
        function ComparePaints(paintA, paintB) {
            if (paintA == null || paintB == null)
                return false;
            if (paintA.type == "SOLID" && paintB.type == "SOLID") {
                if (JSON.stringify(paintA.color) == JSON.stringify(paintB.color))
                    return true;
            }
            else
                return false;
        }
    }
    function GenerateTokens() {
        themeNameList.forEach(themeName => {
            const theme = themeList.find(theme => theme.name == themeName);
            // move sys folder
            if (theme.styles.find(style => style.name.includes("]/sys"))) {
                console.log("skip " + themeName);
            }
            else {
                // add sys folder
                sysLinks.forEach(sysLink => {
                    const sysStyle = figma.createPaintStyle();
                    sysStyle.name = '[' + themeName + ']/' + sysLink.sysName;
                    const newPaints = [];
                    sysLink.linkPaints.forEach((paint, i) => {
                        if (paint.isDynamic) {
                            const refStyle = theme.styles.find(style => style.name.split("]/")[1] == paint.refName);
                            if (refStyle) {
                                newPaints.push(refStyle.paints[0]);
                            }
                            // sysStyle.paints = refStyle.paints
                        }
                        else {
                            newPaints.push(paint.paint);
                        }
                    });
                    sysStyle.paints = newPaints;
                });
            }
        });
    }
    if (msg.type === 'generate') {
        GetAllThemes();
        GetAllLinks();
        GenerateTokens();
    }
    if (msg.quit)
        figma.closePlugin();
    // Make sure to close the plugin when you're done. Otherwise the plugin will
    // keep running, which shows the cancel button at the bottom of the screen.
};

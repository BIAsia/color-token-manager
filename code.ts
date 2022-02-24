// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (see documentation).

// This shows the HTML page in "ui.html".
let allPaintStyles = figma.getLocalPaintStyles();
let defaultThemeName = "default"

interface themeStyles {
  name: string;
  styles: PaintStyle[]
}
  
interface linkPaint {
  isDynamic: boolean;
  refName?: string;
  paint?: Paint;
}

interface sysLink {
  sysName: string;
  linkPaints: linkPaint[]
}

let themeList: themeStyles[] = [];
let themeNameList: string[] = [];
let sysLinks: sysLink[] = [];


figma.showUI(__html__);
figma.ui.resize(300, 500)
GetAllThemes()
GetAllLinks()
figma.ui.postMessage({ themeNameList:themeNameList, themeList: themeList })
// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = msg => {
  // One way of distinguishing between different types of messages sent from
  // your HTML page is to use an object with a "type" property like this.

  if (msg.type === 'generate') {
    allPaintStyles = figma.getLocalPaintStyles();
    GetAllThemes()
    GetAllLinks()
    GenerateTokens()
    figma.ui.postMessage({ themeNameList:themeNameList, themeList: themeList })
  }

  if (msg.type === 'default-changed') {
    defaultThemeName = msg.defaultThemeName
    allPaintStyles = figma.getLocalPaintStyles();
    GetAllThemes()
    GetAllLinks()
    figma.ui.postMessage({sysLinks: sysLinks})
  }

  // if (msg.type === 'refresh') {
  //   allPaintStyles = figma.getLocalPaintStyles();
  //   GetAllThemes()
  //   GetAllLinks()
  //   figma.ui.postMessage({ themeNameList:themeNameList, themeList: themeList })
  // }

  if (msg.quit) figma.closePlugin();

  // figma.ui.postMessage({ themeNameList:themeNameList , sysLinks: sysLinks, themeList: themeList })

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  
};


function GetAllThemes(){
  themeList = []
  themeNameList = []
  allPaintStyles.forEach(style => {
    if (style.name.startsWith("[")){
      // 是主题样式
      const themeName = style.name.split("]")[0].split("[")[1];
  
      if (!themeNameList.find(name => name == themeName))
        themeNameList.push(themeName)
    }
  })
  
  for (let i = 0; i < themeNameList.length; i++){
    const currentThemeStyle = allPaintStyles.filter(style=>
      style.name.includes(themeNameList[i]))
    const newTheme:themeStyles = {
      name: themeNameList[i],
      styles: currentThemeStyle
    }
    themeList.push(newTheme)
  }
}

function GetAllLinks(){
  sysLinks = []
  const defaultPaintStyles = allPaintStyles.filter(style => 
    style.name.startsWith('[' + defaultThemeName + ']')
  )
  const RefPaintStyles = defaultPaintStyles.filter(style => 
    style.name.startsWith('[' + defaultThemeName + ']'+'/ref')
  )
  const SysPaintStyles = defaultPaintStyles.filter(style => 
    style.name.startsWith('[' + defaultThemeName + ']'+'/sys')
  )
  const universePaintStyles = allPaintStyles.filter(style =>
    style.name.startsWith('universe'))

  
  SysPaintStyles.forEach(sys => {
    const newLink:sysLink = {
      sysName: sys.name.split("]/")[1],
      linkPaints: []
    }
    
    sys.paints.forEach((sysPaint,i) => {
      const newLinkPaint:linkPaint = {
        isDynamic: true
      }
      const refStyle = RefPaintStyles.find(ref => ComparePaints(sysPaint, ref.paints[i]))
      if (refStyle == null) {
        newLinkPaint.isDynamic = false;
        newLinkPaint.paint = sysPaint;
      } else {
        newLinkPaint.refName = refStyle.name.split("]/")[1];
      }
      if (newLinkPaint.refName || newLinkPaint.paint){
        newLink.linkPaints.push(newLinkPaint)
      }
    })
    if (newLink.linkPaints)
      sysLinks.push(newLink)    
  })
  
}
function ComparePaints(paintA:Paint, paintB:Paint){
  if (paintA == null || paintB == null) return false
  if (paintA.type == "SOLID" && paintB.type == "SOLID"){
    if (JSON.stringify(paintA.color) == JSON.stringify(paintB.color))
      return true;
  } else return false;
}

function GenerateTokens(){
  themeNameList.forEach(themeName => {
    const theme = themeList.find(theme => theme.name == themeName)
    // move sys folder
    if (theme.styles.find(style => style.name.includes("]/sys"))){
      console.log("skip "+themeName)
    } else {
      // add sys folder
      sysLinks.forEach(sysLink => {
        const sysStyle = figma.createPaintStyle()
        sysStyle.name = '['+themeName+']/'+sysLink.sysName;
        const newPaints:Paint[] = []
        sysLink.linkPaints.forEach((paint,i) => {
          if (paint.isDynamic){
            const refStyle = theme.styles.find(style => style.name.split("]/")[1] == paint.refName)
            if (refStyle){
              newPaints.push(refStyle.paints[0])
            }
            // sysStyle.paints = refStyle.paints
          } else {
            newPaints.push(paint.paint)
          }
        })
        
        sysStyle.paints = newPaints;
        
      })
    }
  })
}
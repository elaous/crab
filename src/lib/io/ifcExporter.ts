import type { SceneObject, BoxDims, SphereDims, CylinderDims, ConeDims } from '../../types'

function generateGuid(): string {
  // Simple pseudo-GUID for IFC
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`
}

function fmtFloat(n: number): string {
  return n.toFixed(6)
}

export function exportIFC(objects: Map<string, SceneObject>, sceneName: string): string {
  const now = new Date().toISOString()
  const lines: string[] = []

  lines.push('ISO-10303-21;')
  lines.push('HEADER;')
  lines.push(`FILE_DESCRIPTION(('Facet 3D Export'),'2;1');`)
  lines.push(`FILE_NAME('${sceneName}','${now}',('Facet 3D'),('Facet 3D'),'Facet 3D','Facet 3D','');`)
  lines.push(`FILE_SCHEMA(('IFC2X3'));`)
  lines.push('ENDSEC;')
  lines.push('DATA;')

  let id = 1

  // Project setup
  const projectId = id++
  const contextId = id++
  const unitsId = id++
  const unitAssignmentId = id++
  const siteId = id++
  const buildingId = id++
  const storeyId = id++
  const ownerHistId = id++
  const personId = id++
  const orgId = id++
  const appId = id++

  lines.push(`#${personId}=IFCPERSON($,$,'Facet 3D',$,$,$,$,$);`)
  lines.push(`#${orgId}=IFCORGANIZATION($,'Facet 3D',$,$,$);`)
  lines.push(`#${appId}=IFCAPPLICATION(#${orgId},'1.0','Facet 3D','Facet 3D');`)
  lines.push(`#${ownerHistId}=IFCOWNERHISTORY(#${personId},#${appId},$,.ADDED.,$,#${personId},#${appId},$);`)

  // Geometry context
  const worldCoordSysId = id++
  const worldOriginId = id++
  const worldAxisId = id++
  lines.push(`#${worldOriginId}=IFCCARTESIANPOINT((0.,0.,0.));`)
  lines.push(`#${worldAxisId}=IFCDIRECTION((0.,0.,1.));`)
  lines.push(`#${worldCoordSysId}=IFCAXIS2PLACEMENT3D(#${worldOriginId},$,$);`)
  lines.push(`#${contextId}=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#${worldCoordSysId},$);`)

  // Units
  const lengthUnitId = id++
  lines.push(`#${lengthUnitId}=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);`)
  lines.push(`#${unitsId}=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);`)
  lines.push(`#${unitAssignmentId}=IFCUNITASSIGNMENT((#${unitsId}));`)

  // Project
  lines.push(`#${projectId}=IFCPROJECT('${generateGuid()}',$,'${sceneName}',$,$,$,$,(#${contextId}),#${unitAssignmentId});`)

  // Site
  const sitePlaceId = id++
  const siteOriginId = id++
  lines.push(`#${siteOriginId}=IFCCARTESIANPOINT((0.,0.,0.));`)
  lines.push(`#${sitePlaceId}=IFCAXIS2PLACEMENT3D(#${siteOriginId},$,$);`)
  const siteLocalId = id++
  lines.push(`#${siteLocalId}=IFCLOCALPLACEMENT($,#${sitePlaceId});`)
  lines.push(`#${siteId}=IFCSITE('${generateGuid()}',#${ownerHistId},'Site',$,$,#${siteLocalId},$,$,.ELEMENT.,$,$,$,$,$);`)

  // Building
  const bldgPlaceId = id++
  const bldgOriginId = id++
  lines.push(`#${bldgOriginId}=IFCCARTESIANPOINT((0.,0.,0.));`)
  lines.push(`#${bldgPlaceId}=IFCAXIS2PLACEMENT3D(#${bldgOriginId},$,$);`)
  const bldgLocalId = id++
  lines.push(`#${bldgLocalId}=IFCLOCALPLACEMENT(#${siteLocalId},#${bldgPlaceId});`)
  lines.push(`#${buildingId}=IFCBUILDING('${generateGuid()}',#${ownerHistId},'Building',$,$,#${bldgLocalId},$,$,.ELEMENT.,$,$,$);`)

  // Storey
  const storeyPlaceId = id++
  const storeyOriginId = id++
  lines.push(`#${storeyOriginId}=IFCCARTESIANPOINT((0.,0.,0.));`)
  lines.push(`#${storeyPlaceId}=IFCAXIS2PLACEMENT3D(#${storeyOriginId},$,$);`)
  const storeyLocalId = id++
  lines.push(`#${storeyLocalId}=IFCLOCALPLACEMENT(#${bldgLocalId},#${storeyPlaceId});`)
  lines.push(`#${storeyId}=IFCBUILDINGSTOREY('${generateGuid()}',#${ownerHistId},'Ground Floor',$,$,#${storeyLocalId},$,$,.ELEMENT.,0.);`)

  const elementIds: number[] = []

  objects.forEach(obj => {
    if (obj.type === 'component-instance') return

    const elemOriginId = id++
    const elemPlaceId = id++
    const elemLocalId = id++
    const elemShapeId = id++
    const elemRepId = id++
    const elemId = id++

    const px = fmtFloat(obj.position.x)
    const py = fmtFloat(obj.position.z) // IFC uses Y-up in 2D plan
    const pz = fmtFloat(obj.position.y)

    lines.push(`#${elemOriginId}=IFCCARTESIANPOINT((${px},${py},${pz}));`)
    lines.push(`#${elemPlaceId}=IFCAXIS2PLACEMENT3D(#${elemOriginId},$,$);`)
    lines.push(`#${elemLocalId}=IFCLOCALPLACEMENT(#${storeyLocalId},#${elemPlaceId});`)

    // Geometry per type
    if (obj.type === 'box') {
      const d = obj.dimensions as BoxDims
      const halfW = fmtFloat(d.width / 2)
      const halfD = fmtFloat(d.depth / 2)
      const blId = id++
      const blOriginId = id++
      lines.push(`#${blOriginId}=IFCCARTESIANPOINT((-${halfW},-${halfD},0.));`)
      const blAxisId = id++
      lines.push(`#${blAxisId}=IFCAXIS2PLACEMENT3D(#${blOriginId},$,$);`)
      lines.push(`#${blId}=IFCBLOCK(#${blAxisId},${fmtFloat(d.width)},${fmtFloat(d.depth)},${fmtFloat(d.height)});`)
      lines.push(`#${elemShapeId}=IFCSHAPEREPRESENTATION(#${contextId},'Body','CSG',(#${blId}));`)
    } else if (obj.type === 'sphere') {
      const d = obj.dimensions as SphereDims
      const spOriginId = id++
      const spAxisId = id++
      lines.push(`#${spOriginId}=IFCCARTESIANPOINT((0.,0.,0.));`)
      lines.push(`#${spAxisId}=IFCAXIS2PLACEMENT3D(#${spOriginId},$,$);`)
      const spId = id++
      lines.push(`#${spId}=IFCSPHERE(#${spAxisId},${fmtFloat(d.radius)});`)
      lines.push(`#${elemShapeId}=IFCSHAPEREPRESENTATION(#${contextId},'Body','CSG',(#${spId}));`)
    } else if (obj.type === 'cylinder') {
      const d = obj.dimensions as CylinderDims
      const cyOriginId = id++
      const cyAxisId = id++
      lines.push(`#${cyOriginId}=IFCCARTESIANPOINT((0.,0.,0.));`)
      lines.push(`#${cyAxisId}=IFCAXIS2PLACEMENT3D(#${cyOriginId},$,$);`)
      const cyId = id++
      lines.push(`#${cyId}=IFCRIGHTCIRCULARCYLINDER(#${cyAxisId},${fmtFloat(d.height)},${fmtFloat(d.radius)});`)
      lines.push(`#${elemShapeId}=IFCSHAPEREPRESENTATION(#${contextId},'Body','CSG',(#${cyId}));`)
    } else if (obj.type === 'cone') {
      const d = obj.dimensions as ConeDims
      const coOriginId = id++
      const coAxisId = id++
      lines.push(`#${coOriginId}=IFCCARTESIANPOINT((0.,0.,0.));`)
      lines.push(`#${coAxisId}=IFCAXIS2PLACEMENT3D(#${coOriginId},$,$);`)
      const coId = id++
      lines.push(`#${coId}=IFCRIGHTCIRCULARCONE(#${coAxisId},${fmtFloat(d.height)},${fmtFloat(d.radius)});`)
      lines.push(`#${elemShapeId}=IFCSHAPEREPRESENTATION(#${contextId},'Body','CSG',(#${coId}));`)
    } else {
      // CSG or unknown — use a placeholder box
      const csgOriginId = id++
      const csgAxisId = id++
      const csgBlockId = id++
      lines.push(`#${csgOriginId}=IFCCARTESIANPOINT((-0.5,-0.5,0.));`)
      lines.push(`#${csgAxisId}=IFCAXIS2PLACEMENT3D(#${csgOriginId},$,$);`)
      lines.push(`#${csgBlockId}=IFCBLOCK(#${csgAxisId},1.,1.,1.);`)
      lines.push(`#${elemShapeId}=IFCSHAPEREPRESENTATION(#${contextId},'Body','CSG',(#${csgBlockId}));`)
    }

    lines.push(`#${elemRepId}=IFCPRODUCTDEFINITIONSHAPE($,$,(#${elemShapeId}));`)
    lines.push(`#${elemId}=IFCBUILDINGELEMENTPROXY('${generateGuid()}',#${ownerHistId},'${obj.name}',$,$,#${elemLocalId},#${elemRepId},$,$);`)
    elementIds.push(elemId)
  })

  // Relationships
  if (elementIds.length > 0) {
    const relStoreyId = id++
    const elemRefs = elementIds.map(e => `#${e}`).join(',')
    lines.push(`#${relStoreyId}=IFCRELCONTAINEDINSPATIALSTRUCTURE('${generateGuid()}',$,'Elements',$,(${elemRefs}),#${storeyId});`)
  }

  const relBldgId = id++
  lines.push(`#${relBldgId}=IFCRELAGGREGATES('${generateGuid()}',$,$,$,#${buildingId},(#${storeyId}));`)
  const relSiteId = id++
  lines.push(`#${relSiteId}=IFCRELAGGREGATES('${generateGuid()}',$,$,$,#${siteId},(#${buildingId}));`)
  const relProjId = id++
  lines.push(`#${relProjId}=IFCRELAGGREGATES('${generateGuid()}',$,$,$,#${projectId},(#${siteId}));`)

  lines.push('ENDSEC;')
  lines.push('END-ISO-10303-21;')

  return lines.join('\n')
}

export function downloadIFC(objects: Map<string, SceneObject>, sceneName: string): void {
  const content = exportIFC(objects, sceneName)
  const blob = new Blob([content], { type: 'application/x-step' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = sceneName + '.ifc'
  a.click()
  URL.revokeObjectURL(url)
}

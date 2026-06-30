@0xd3a4b5c6e7f80912;
# Facet 3D scene file format — Cap'n Proto schema
# Version 1.0.0
#
# Wire format: the root message is a SceneFile containing a SceneData struct.
# Debug mode: a sidecar .facet.json is also written with the JSON-serialized form.


struct Vec3 {
  x @0 :Float32;
  y @1 :Float32;
  z @2 :Float32;
}

struct SceneObject {
  id          @0  :Text;
  name        @1  :Text;
  type        @2  :Text;        # box | sphere | cylinder | cone | csg | component-instance
  layerId     @3  :Text;
  assemblyId  @4  :Text;        # empty string = not in a group
  compDefId   @5  :Text;        # empty string = not an instance
  visible     @6  :Bool;
  locked      @7  :Bool;
  color       @8  :Text;        # hex string
  opacity     @9  :Float32;
  roughness   @10 :Float32;
  metalness   @11 :Float32;
  position    @12 :Vec3;
  rotation    @13 :Vec3;
  scale       @14 :Vec3;
  dimsJson    @15 :Text;        # JSON-encoded dimensions (type-specific)
  csgPositions  @16 :List(Float32);
  csgNormals    @17 :List(Float32);
  csgIndices    @18 :List(UInt32);
  matPresetId @19 :Text;
}

struct Layer {
  id      @0 :Text;
  name    @1 :Text;
  color   @2 :Text;
  visible @3 :Bool;
  locked  @4 :Bool;
}

struct Assembly {
  id       @0 :Text;
  name     @1 :Text;
  childIds @2 :List(Text);
  color    @3 :Text;
}

struct ComponentObject {
  # Reuses the same flat fields as SceneObject (relative positioning)
  id       @0 :Text;
  name     @1 :Text;
  type     @2 :Text;
  color    @3 :Text;
  opacity  @4 :Float32;
  roughness @5 :Float32;
  metalness @6 :Float32;
  position @7 :Vec3;
  rotation @8 :Vec3;
  scale    @9 :Vec3;
  dimsJson @10 :Text;
}

struct ComponentDef {
  id          @0 :Text;
  name        @1 :Text;
  description @2 :Text;
  objects     @3 :List(ComponentObject);
  origin      @4 :Vec3;
  color       @5 :Text;
}

struct Annotation {
  id       @0 :Text;
  type     @1 :Text;       # label | dimension
  text     @2 :Text;
  position @3 :Vec3;
  hasTo    @4 :Bool;
  to       @5 :Vec3;
  color    @6 :Text;
  fontSize @7 :Float32;
}

struct CameraSnapshot {
  id     @0 :Text;
  name   @1 :Text;
  preset @2 :Text;
  mode   @3 :Text;
  position @4 :Vec3;
  target   @5 :Vec3;
  fov    @6 :Float32;
  zoom   @7 :Float32;
}

struct SceneSettings {
  units          @0  :Text;
  precision      @1  :UInt8;
  snapEnabled    @2  :Bool;
  snapDistance   @3  :Float32;
  gridVisible    @4  :Bool;
  axesVisible    @5  :Bool;
  displayMode    @6  :Text;
  shadowsEnabled @7  :Bool;
  outlineEnabled @8  :Bool;
  sobelEnabled   @9  :Bool;
  aoEnabled      @10 :Bool;
  sunAzimuth     @11 :Float32;
  sunElevation   @12 :Float32;
  sunIntensity   @13 :Float32;
  sectionEnabled @14 :Bool;
  sectionAxis    @15 :Text;
  sectionOffset  @16 :Float32;
}

struct SceneData {
  version       @0  :Text;
  name          @1  :Text;
  objects       @2  :List(SceneObject);
  layerOrder    @3  :List(Text);
  layers        @4  :List(Layer);
  assemblies    @5  :List(Assembly);
  componentDefs @6  :List(ComponentDef);
  settings      @7  :SceneSettings;
  snapshots     @8  :List(CameraSnapshot);
  annotations   @9  :List(Annotation);
  createdAt     @10 :Text;
  updatedAt     @11 :Text;
}

struct SceneFile {
  # Root message wrapper — contains the scene plus format metadata
  formatVersion @0 :UInt16 = 1;
  scene         @1 :SceneData;
  # debugJson is non-empty when debug serialization is active
  debugJson     @2 :Text;
}

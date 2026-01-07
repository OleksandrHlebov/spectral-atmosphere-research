const float gGroundRadius = 6371.f;
const float gAtmosphereRadius = 6471.f;

const vec3 gGroundAlbedo = vec3(.1f);

const vec3 gRayleighScatteringCoef = vec3(5.802f, 13.558f, 33.1f) * 1e-3;
const float gRayleighAbsorptionCoef = .0f;

const float gMieScatteringCoef = 3.996 * 1e-3;
const float gMieAbsorptionCoef = 4.4f * 1e-3;

const float gOzoneScatteringCoef = .0f;
const vec3 gOzoneAbsorptionCoef = vec3(.650f, 1.881f, .085f) * 1e-3;

const int gOpticalDepthSamples = 40;
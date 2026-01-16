const float gGroundRadius = 6371.f;
const float gAtmosphereRadius = 6471.f;

const vec4 gGroundAlbedo = vec4(.3f);

const vec3 gRayleighScatteringCoef = vec3(5.802f, 13.558f, 33.1f) * 1e-3;
const float gRayleighAbsorptionCoef = .0f;

const float gMieScatteringCoef = 0 * 3.996 * 1e-3;
const float gMieAbsorptionCoef = 0 * 4.4f * 1e-3;

const float gOzoneScatteringCoef = .0f;
const vec3 gOzoneAbsorptionCoef = vec3(.650f, 1.881f, .085f) * 1e-3;

// The Sun spectral irradiance is also multiplied by a constant factor to
// compensate for the fact that we use the spectral samples directly as RGB,
// which is incorrect.
const vec3 gSunRGBIrradiance = vec3(1.500, 1.864, 1.715) * 150.0;

const int gOpticalDepthSamples = 40;
const int gMultipleScatteringSamples = 20;
const int gScatteringSamples = 40;
const int gSqrtSamples = 20;
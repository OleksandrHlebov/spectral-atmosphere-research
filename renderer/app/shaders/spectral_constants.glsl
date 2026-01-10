// based on fgarlin's blogpost: https://fgarlin.com/blog/spectral-sky/
// and his implementation of spectral atmosphere rendering
const float gExposure = -4.0;
// Extraterrestial Solar Irradiance Spectra, units W * m^-2 * nm^-1
// https://www.nrel.gov/grid/solar-resource/spectra.html
const vec4 gSunSpectralIrradiance = vec4(1.679, 1.828, 1.986, 1.307);
// Rayleigh scattering coefficient at sea level, units km^-1
// "Rayleigh-scattering calculations for the terrestrial atmosphere"
// by Anthony Bucholtz (1995).
const vec4 gMolecularScatteringCoefficient = vec4(6.605e-3, 1.067e-2, 1.842e-2, 3.156e-2);
// Ozone absorption cross section, units m^2 / molecules
// "High spectral resolution ozone absorption cross-sections"
// by V. Gorshelev et al. (2014).
const vec4 gOzoneAbsorptionCrossSection = vec4(3.472e-21, 3.914e-21, 1.349e-21, 11.03e-23) * 1e-4f;
const float gOzoneMean = 347.f;

// conversion matrix from spectral to rgb
// All parameters that depend on wavelength (vec4) are sampled at
// 630, 560, 490, 430 nanometers

const mat4x3 gRGBConversionMatrix = mat4x3(
137.672389239975, -8.632904716299537, -1.7181567391931372,
32.549094028629234, 91.29801417199785, -12.005406444382531,
-38.91428392614275, 34.31665471469816, 29.89044807197628,
8.572844237945445, -11.103384660054624, 117.47585277566478
);
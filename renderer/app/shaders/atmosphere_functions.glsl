#extension GL_GOOGLE_include_directive: require
#include "math_constants.glsl"
#include "math_functions.glsl"
#include "atmosphere_constants.glsl"

float MiePhase(float theta)
{
    const float strength = .8f; // relative strength of forward/backward scattering; default = 0.8
    const float cosTheta = cos(theta);

    const float numerator = 3 * (1 - pow(strength, 2)) * (1 + pow(cosTheta, 2));
    const float denom = 8 * gPI * (2 + pow(strength, 2)) * pow((1 + pow(cosTheta, 2) - 2 * strength * cosTheta), 1.5f);
    return numerator / denom;
}

float RayleighPhase(float theta)
{
    return 3 * (1 + pow(cos(theta), 2)) / (16 * gPI);
}

float RayleighDensity(float altitude)
{
    return exp(-altitude / 8.f);
}

vec3 RayleighScattering(float altitude)
{
    return gRayleighScatteringCoef * RayleighDensity(altitude);
}

float MieDensity(float altitude)
{
    return exp(-altitude / 1.2f);
}

float MieScattering(float altitude)
{
    return gMieScatteringCoef * MieDensity(altitude);
}

float OzoneDensity(float altitude)
{
    return max(.0f, 1 - abs(altitude - 25.f) / 15.f);
}

vec3 FindPlanetRelativePosition(vec3 worldPosition)
{
    return .001f * worldPosition + vec3(.0f, gGroundRadius, .0f); // .001f to convert meters of world position to kilometers
}

float FindAltitudeAtWorldPosition(vec3 position)
{
    return length(FindPlanetRelativePosition(position)) - gGroundRadius;
}

float FindAltitude(vec3 planetRelativePosition)
{
    return length(planetRelativePosition) - gGroundRadius;
}

vec3 ExtinctionCoef(float altitude)
{
    const float rayleighDensity = RayleighDensity(altitude);
    const vec3 rayleighScattering = gRayleighScatteringCoef * rayleighDensity;
    const float rayleighAbsorption = gRayleighAbsorptionCoef * rayleighDensity;

    const float mieDensity = MieDensity(altitude);
    const float mieScattering = gMieScatteringCoef * mieDensity;
    const float mieAbsorption = gMieAbsorptionCoef * mieDensity;

    const float ozoneDensity = OzoneDensity(altitude);
    const float ozoneScattering = gOzoneScatteringCoef * ozoneDensity;
    const vec3 ozoneAbsorption = gOzoneAbsorptionCoef * ozoneDensity;

    return rayleighScattering + rayleighAbsorption
    + mieScattering + mieAbsorption
    + ozoneScattering + ozoneAbsorption;
}

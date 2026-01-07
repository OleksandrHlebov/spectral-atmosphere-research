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

vec3 SampleLUT(sampler2D lut, float altitude, float cosTheta)
{
    const float u = .5f + .5f * cosTheta;
    const float v = max(0, min((altitude - gGroundRadius) / (gAtmosphereRadius - gGroundRadius), 1));
    return texture(lut, vec2(u, v)).xyz;
}

vec3 FindSkyScattering(sampler2D transmittanceImage, sampler2D multipleScatteringImage
, vec3 viewPosition, vec3 rayDirection, vec3 sunDirection)
{
    const vec2 atmosphereExits = RayIntersectSphere2D(viewPosition, rayDirection, gAtmosphereRadius);
    const float distanceToGround = RayIntersectSphere(viewPosition, rayDirection, gGroundRadius);

    if (atmosphereExits.x >= atmosphereExits.y)
    {
        // no intersection with atmosphere
        return vec3(.0f);
    }

    // if inside the atmosphere use view position
    const float minDistance = length(viewPosition) < gAtmosphereRadius ? .0f : max(.0f, atmosphereExits.x);
    // if ground in the way, use it instead of atmosphere exit point
    const float maxDistance = distanceToGround > .0f ? distanceToGround : max(.0f, atmosphereExits.y);

    const vec3 rayStart = viewPosition + minDistance * rayDirection;
    const float cosTheta = dot(rayDirection, sunDirection);
    const float miePhase = MiePhase(cosTheta);
    const float rayleighPhase = RayleighPhase(cosTheta);

    vec3 luminance = vec3(.0f);
    vec3 transmittance = vec3(1.f);
    float t = .0f;
    for (float step = .0f; step < gScatteringSamples; ++step)
    {
        const float newT = ((step + .3f) / gScatteringSamples) * (maxDistance - minDistance);
        const float deltaT = newT - t;
        t = newT;

        const vec3 position = rayStart + t * rayDirection;
        const float altitude = max(1e-6f, FindAltitude(position));

        const float mieScattering = MieScattering(altitude);
        const vec3 rayleighScattering = RayleighScattering(altitude);
        const vec3 extinction = max(vec3(.001f), ExtinctionCoef(altitude));

        const vec3 stepTransmittance = exp(-deltaT * extinction);
        const vec3 sunTransmittance = SampleLUT(transmittanceImage, altitude, cosTheta);
        const vec3 psims = SampleLUT(multipleScatteringImage, altitude, cosTheta);

        const vec3 rayleighInScattering = rayleighScattering * (rayleighPhase * sunTransmittance + psims);
        const vec3 mieInScattering = mieScattering * (miePhase * sunTransmittance + psims);
        const vec3 totalInScattering = rayleighInScattering + mieInScattering;

        const vec3 scatteringIntegral = (totalInScattering - totalInScattering * stepTransmittance) / extinction;

        luminance += scatteringIntegral * transmittance;

        transmittance *= stepTransmittance;
    }

    return luminance;
}
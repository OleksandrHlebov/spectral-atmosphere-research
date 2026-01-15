#include "spectral_constants.glsl"
#include "atmosphere_functions.glsl"

vec4 GetMolecularScatteringCoef(float altitude)
{
    return gMolecularScatteringCoefficient * exp(-0.07771971 * pow(altitude, 1.16364243));
}

vec4 GetMolecularAbsorptionCoef(float altitude)
{
    const float t = log(altitude) - 3.22261f;
    const float density = 3.78547397e20 * (1.0 / altitude) * exp(-t * t * 5.55555555);
    return gOzoneAbsorptionCrossSection * gOzoneMean * density;
}

vec4 SpectralExtinctionCoef(float altitude)
{
    const vec4 molecular_absorption = GetMolecularAbsorptionCoef(altitude);
    const vec4 molecular_scattering = GetMolecularScatteringCoef(altitude);
    const float mieDensity = MieDensity(altitude);
    const float mieScattering = gMieScatteringCoef * mieDensity;
    const float mieAbsorption = gMieAbsorptionCoef * mieDensity;
    return molecular_absorption + molecular_scattering + mieScattering + mieAbsorption;
}

vec3 FindSkyScatteringSpectral(sampler2D transmittanceImage, sampler2D multipleScatteringImage
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
    const float rayleighPhase = RayleighPhase(-cosTheta);

    vec4 luminance = vec4(.0f);
    vec4 transmittance = vec4(1.f);
    float t = .0f;
    for (float step = .0f; step < gScatteringSamples; ++step)
    {
        const float newT = ((step + .3f) / gScatteringSamples) * (maxDistance - minDistance);
        const float deltaT = newT - t;
        t = newT;

        const vec3 position = rayStart + t * rayDirection;

        const float altitude = FindAltitude(position);

        const float mieScattering = MieScattering(altitude);
        const vec4 moleculeScattering = GetMolecularScatteringCoef(altitude);
        const vec4 extinction = SpectralExtinctionCoef(altitude);

        const vec4 stepTransmittance = exp(-deltaT * extinction);
        const vec3 up = normalize(position);
        const float sunZenithCosAngle = dot(sunDirection, up);

        const vec4 sunTransmittance = SampleLUT(transmittanceImage, altitude, sunZenithCosAngle);
        const vec4 psims = SampleLUT(multipleScatteringImage, altitude, sunZenithCosAngle);

        const vec4 rayleighInScattering = moleculeScattering * (rayleighPhase * sunTransmittance + psims);
        const vec4 mieInScattering = mieScattering * (miePhase * sunTransmittance + psims);
        const vec4 totalInScattering = gSunSpectralIrradiance * (rayleighInScattering + mieInScattering);

        const vec4 scatteringIntegral = (totalInScattering - totalInScattering * stepTransmittance) / extinction;

        luminance += scatteringIntegral * transmittance;

        transmittance *= stepTransmittance;
    }

    return gRGBConversionMatrix * luminance;
}

vec3 FindSkyScattering(sampler2D transmittanceImage, sampler2D multipleScatteringImage
, vec3 viewPosition, vec3 rayDirection, vec3 sunDirection, bool spectral)
{
    if (spectral)
    return FindSkyScatteringSpectral(transmittanceImage, multipleScatteringImage, viewPosition, rayDirection, sunDirection);
    else
    return FindSkyScatteringRGB(transmittanceImage, multipleScatteringImage, viewPosition, rayDirection, sunDirection);
}


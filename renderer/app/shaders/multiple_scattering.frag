#version 450
#extension GL_GOOGLE_include_directive: require
#include "spectral_functions.glsl"

// slightly modified version of:
// https://www.shadertoy.com/view/fd2fWc

layout (constant_id = 0) const bool spectral = false;

layout (location = 0) in vec2 inUV;

layout (location = 0) out vec4 outColor;

layout (binding = 2) uniform sampler2D transmittanceImage;

void CalculateMultipleScattering(vec3 position, vec3 sunDirection, out vec4 totalLuminance, out vec4 fms)
{
    totalLuminance = vec4(.0f);
    fms = vec4(.0f);
    float invSamples = 1.0 / float(gSqrtSamples * gSqrtSamples);

    for (int x = 0; x < gSqrtSamples; ++x)
    for (int y = 0; y < gSqrtSamples; ++y)
    {
        const float theta = gPI * (float(x) + 0.5) / float(gSqrtSamples);
        const float phi = safeacos(1.f - 2.f * (float(y) + .5f) / float(gSqrtSamples));
        const vec3 rayDirection = FindSphericalDirection(theta, phi);

        const float distanceToExit = RayIntersectSphere(position, rayDirection, gAtmosphereRadius);
        const float distanceToGround = RayIntersectSphere(position, rayDirection, gGroundRadius);
        const float tMax = distanceToGround > .0f ? distanceToGround : distanceToExit;

        const float cosTheta = dot(rayDirection, sunDirection);
        const float miePhase = MiePhase(cosTheta);
        const float rayleighPhase = RayleighPhase(cosTheta);

        vec4 luminance = vec4(.0f);
        vec4 luminanceFactor = vec4(.0f);
        vec4 transmittance = vec4(1.f);
        float t = .0f;
        for (float step = .0f; step < float(gMultipleScatteringSamples); step += 1.f)
        {
            const float newT = ((step + .3) / gMultipleScatteringSamples) * tMax;
            const float deltaT = newT - t;
            t = newT;

            const vec3 newPosition = position + t * rayDirection;
            const float newAltitude = FindAltitude(newPosition);
            const float mieScattering = MieScattering(newAltitude);
            const vec4 rayleighScattering = spectral ? GetMolecularScatteringCoef(newAltitude) : vec4(RayleighScattering(newAltitude), .0f);
            const vec4 extinction = spectral ? SpectralExtinctionCoef(newAltitude) : vec4(ExtinctionCoef(newAltitude), .0f);
            const vec4 stepTransmittance = exp(-deltaT * extinction);

            const vec4 scatteringNoPhase = rayleighScattering + mieScattering;
            const vec4 scatteringF = (scatteringNoPhase - scatteringNoPhase * stepTransmittance) / extinction;
            luminanceFactor += transmittance * scatteringF;

            const vec3 up = normalize(newPosition);
            const float sunZenithCosAngle = dot(sunDirection, up);
            const vec4 sunTransmittance = SampleLUT(transmittanceImage, newAltitude, sunZenithCosAngle);
            const vec4 rayleighInScattering = rayleighScattering * rayleighPhase;
            const float mieInScattering = mieScattering * miePhase;
            const vec4 totalInScattering = (rayleighInScattering + mieInScattering) * sunTransmittance;

            const vec4 scatteringIntegral = (totalInScattering - totalInScattering * stepTransmittance) / extinction;

            luminance += scatteringIntegral * transmittance;
            transmittance *= stepTransmittance;
        }

        // calculate ground's contribution to luminance
        if (distanceToGround > .0f)
        {
            const vec3 groundNormal = normalize(position + distanceToGround * rayDirection);
            if (dot(groundNormal, sunDirection) > .0f) // sunlit or not
            {
                const vec3 groundPosition = groundNormal * gGroundRadius;
                const float cosTheta = dot(groundNormal, sunDirection);
                luminance += transmittance * gGroundAlbedo * SampleLUT(transmittanceImage, FindAltitude(groundPosition), cosTheta);
            }
        }

        fms += luminanceFactor * invSamples;
        totalLuminance += luminance * invSamples;
    }
}

void main()
{
    const float cosTheta = 2.f * inUV.x - 1.f;
    const float theta = safeacos(cosTheta);
    const float height = mix(gGroundRadius, gAtmosphereRadius, inUV.y);

    const vec3 position = vec3(.0f, height, .0f);
    const vec3 lightDirection = vec3(.0f, cosTheta, sin(theta));

    vec4 luminance, fms;
    CalculateMultipleScattering(position, lightDirection, luminance, fms);

    const vec4 psi = luminance / (1.f - fms);
    outColor = psi;
}
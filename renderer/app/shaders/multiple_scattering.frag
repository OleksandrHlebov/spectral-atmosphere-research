#version 450
#extension GL_GOOGLE_include_directive: require
#include "atmosphere_functions.glsl"

// slightly modified version of:
// https://www.shadertoy.com/view/fd2fWc

layout (location = 0) in vec2 inUV;

layout (location = 0) out vec4 outColor;

layout (binding = 2) uniform sampler2D transmittanceImage;

vec3 FindSphericalDirection(float theta, float phi)
{
    const float cosPhi = cos(phi);
    const float sinPhi = sin(phi);
    const float cosTheta = cos(theta);
    const float sinTheta = sin(theta);
    return vec3(sinPhi * sinTheta, cosPhi, sinPhi * cosTheta);
}

void CalculateMultipleScattering(vec3 position, vec3 sunDirection, out vec3 totalLuminance, out vec3 fms)
{
    totalLuminance = vec3(.0f);
    fms = vec3(.0f);
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

        vec3 luminance = vec3(.0f);
        vec3 luminanceFactor = vec3(.0f);
        vec3 transmittance = vec3(1.f);
        float t = .0f;
        for (float step = .0f; step < float(gMultipleScatteringSamples); step += 1.f)
        {
            const float newT = ((step + .3) / gMultipleScatteringSamples) * tMax;
            const float deltaT = newT - t;
            t = newT;

            const vec3 newPosition = position + t * rayDirection;
            const float newAltitude = FindAltitude(newPosition);
            const float mieScattering = MieScattering(newAltitude);
            const vec3 rayleighScattering = RayleighScattering(newAltitude);
            const vec3 extinction = max(ExtinctionCoef(newAltitude), vec3(1e-8));
            const vec3 stepTransmittance = exp(-deltaT * extinction);

            const vec3 scatteringNoPhase = rayleighScattering + mieScattering;
            const vec3 scatteringF = (scatteringNoPhase - scatteringNoPhase * stepTransmittance) / extinction;
            luminanceFactor += transmittance * scatteringF;

            const vec3 up = normalize(newPosition);
            const float sunZenithCosAngle = dot(sunDirection, up);
            const vec3 sunTransmittance = SampleLUT(transmittanceImage, newAltitude, sunZenithCosAngle);
            const vec3 rayleighInScattering = rayleighScattering * rayleighPhase;
            const float mieInScattering = mieScattering * miePhase;
            const vec3 totalInScattering = (rayleighInScattering + mieInScattering) * sunTransmittance;

            const vec3 scatteringIntegral = (totalInScattering - totalInScattering * stepTransmittance) / extinction;

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
    const vec3 lightDirection = vec3(.0f, cosTheta, -sin(theta));

    vec3 luminance, fms;
    CalculateMultipleScattering(position, lightDirection, luminance, fms);

    const vec3 psi = luminance / (1.f - fms);
    outColor = vec4(psi, 1.f);
}
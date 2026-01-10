#version 450
#extension GL_GOOGLE_include_directive: require
#include "spectral_functions.glsl"

layout (constant_id = 0) const bool spectral = false;

layout (location = 0) in vec2 inUV;

layout (location = 0) out vec4 outColor;

vec3 TransmittanceExponent(vec3 position, float cosTheta)
{
    const float sinTheta = sqrt(max(0.f, 1.f - cosTheta * cosTheta));
    const vec3 direction = vec3(.0f, cosTheta, -sinTheta);

    if (RayIntersectSphere(position, direction, gGroundRadius) > 0.0) {
        return vec3(1e10);
    }

    const float distanceToExit = RayIntersectSphere(position, direction, gAtmosphereRadius);
    const float distancePerStep = distanceToExit / gOpticalDepthSamples;

    // midpoint sampling for more accurate results compared to sampling at edges
    float t = .5f * distancePerStep;
    vec3 exponent = vec3(.0f);
    // ray march to exit from the atmosphere
    for (int step = 0; step < gOpticalDepthSamples; ++step)
    {
        const vec3 newPosition = position + t * direction; // next position along the ray
        const vec3 extinction = ExtinctionCoef(FindAltitude(newPosition));
        exponent += extinction * distancePerStep;

        t += distancePerStep;
    }
    return exponent;
}

vec4 CalculateTransmittance(vec3 position, float cosTheta)
{
    //    return exp(-TransmittanceExponent(position, cosTheta));
    const float sinTheta = sqrt(max(0.f, 1.f - cosTheta * cosTheta));
    const vec3 direction = vec3(.0f, cosTheta, -sinTheta);
    if (RayIntersectSphere(position, direction, gGroundRadius) > 0.0) {
        return vec4(.0f);
    }

    const float distanceToAtmosphere = RayIntersectSphere(position, direction, gAtmosphereRadius);

    float t = .0f;
    vec4 transmittance = vec4(1.f);
    for (float step = 0.f; step < gOpticalDepthSamples; ++step)
    {
        const float newT = ((step + .3f) / gOpticalDepthSamples) * distanceToAtmosphere;
        const float deltaT = newT - t;
        t = newT;

        const vec3 newPosition = position + t * direction;
        const float newAltitude = FindAltitude(newPosition);

        const vec4 extinction = spectral ? SpectralExtinctionCoef(newAltitude) : vec4(ExtinctionCoef(newAltitude), .0f);

        transmittance *= exp(-deltaT * extinction);
    }
    return transmittance;
}

void main()
{
    const float cosTheta = 2.f * inUV.x - 1.f;
    const float altitude = mix(gGroundRadius, gAtmosphereRadius, inUV.y);
    const vec3 position = vec3(.0f, altitude, .0f);

    outColor = CalculateTransmittance(position, cosTheta);
}
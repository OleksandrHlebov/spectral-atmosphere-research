#version 450
#extension GL_GOOGLE_include_directive: require
#include "atmosphere_functions.glsl"

layout (location = 0) in vec2 inUV;

layout (location = 0) out vec4 outColor;

vec3 TransmittanceExponent(vec3 position, float cosTheta)
{
    const vec3 direction = vec3(sqrt(1.f - pow(cosTheta, 2)), cosTheta, .0f);

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

vec3 CalculateTransmittance(vec3 position, float cosTheta)
{
    return exp(-TransmittanceExponent(position, cosTheta));
}

void main()
{
    const float cosTheta = 2.f * inUV.x - 1.f;
    const float altitude = mix(gGroundRadius, gAtmosphereRadius, inUV.y);

    const vec3 position = vec3(.0f, altitude, .0f);

    outColor = vec4(CalculateTransmittance(position, cosTheta), 1.f);
}
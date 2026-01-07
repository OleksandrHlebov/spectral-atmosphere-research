#version 450
#extension GL_GOOGLE_include_directive: require
#include "atmosphere_functions.glsl"

layout (location = 0) in vec2 inUV;

layout (location = 0) out vec4 outColor;

layout (binding = 2) uniform sampler2D transmittanceImage;
layout (binding = 3) uniform sampler2D multipleScatteringImage;

layout (push_constant) uniform Constants
{
    vec3 CameraPosition;
};

float ConvertToLatitude(float v)
{
    const float latitude = 2.f * v - 1.f;
    return latitude * abs(latitude); // preserve sign after squaring
}

void main()
{
    const float azimuth = (inUV.x - .5f) * 2.f * gPI;
    const vec3 planetRelativePosition = FindPlanetRelativePosition(CameraPosition);
    const float altitude = length(planetRelativePosition);
    const vec3 up = planetRelativePosition / altitude;
    const float latitude = ConvertToLatitude(inUV.y);

    const float horizonAngle = safeacos(sqrt(pow(altitude, 2) - pow(gGroundRadius, 2)) / altitude) - .5f * gPI;
    const float altitudeAngle = latitude * .5f * gPI - horizonAngle;

    const float cosAltitude = cos(altitudeAngle);
    const vec3 rayDirection = vec3(cosAltitude * sin(azimuth), sin(altitudeAngle), -cosAltitude * cos(azimuth));

    const float sunAltitude = .9f;
    const vec3 sunDirection = vec3(.0f, sin(sunAltitude), -cos(sunAltitude));
    const vec3 luminance = FindSkyScattering(transmittanceImage, multipleScatteringImage, planetRelativePosition, rayDirection, sunDirection);

    outColor = vec4(luminance, 1.f);
}
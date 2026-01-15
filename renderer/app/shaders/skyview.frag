#version 450
#extension GL_GOOGLE_include_directive: require
#include "spectral_functions.glsl"

layout (constant_id = 0) const bool spectral = false;

layout (location = 0) in vec2 inUV;

layout (location = 0) out vec4 outColor;

layout (binding = 2) uniform sampler2D transmittanceImage;
layout (binding = 3) uniform sampler2D multipleScatteringImage;

layout (push_constant) uniform Constants
{
    vec4 CameraPosition_Fov;
    vec4 CameraForward_AspectRatio;
    float Time;
};

float ConvertToElevation(float v)
{
    const float latitude = 2.f * v - 1.f;
    return latitude * abs(latitude) * gPI * .5f; // preserve sign after squaring
}

void main()
{
    const float azimuth = (inUV.x - .5f) * 2.f * gPI;
    const vec3 planetRelativePosition = FindPlanetRelativePosition(CameraPosition_Fov.xyz);
    const float elevation = ConvertToElevation(inUV.y);

    const float cosElevation = cos(elevation);

    const vec3 rayDirection = vec3(cosElevation * sin(azimuth), sin(elevation), -cosElevation * cos(azimuth));

    const float sunAltitude = GetSunAltitude(Time);
    const vec3 sunDirection = normalize(vec3(cos(sunAltitude), sin(sunAltitude), .0f));
    const vec3 luminance = FindSkyScattering(transmittanceImage, multipleScatteringImage, planetRelativePosition, rayDirection, sunDirection, spectral);

    outColor = vec4(luminance, 1.f);
}
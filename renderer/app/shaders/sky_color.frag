#version 450
#extension GL_GOOGLE_include_directive: require
#include "atmosphere_functions.glsl"

layout (location = 0) in vec2 inUV;

layout (binding = 1) uniform sampler2D depthBuffer;
layout (binding = 2) uniform sampler2D transmittanceImage;
layout (binding = 3) uniform sampler2D multipleScatteringImage;
layout (binding = 4) uniform sampler2D skyviewImage;

layout (push_constant) uniform Constants
{
    vec4 CameraPosition_Fov;
    vec4 CameraForward_AspectRatio;
    float Time;
    bool UseSkyview;
};

vec3 jodieReinhardTonemap(vec3 c) {
    // From: https://www.shadertoy.com/view/tdSXzD
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    vec3 tc = c / (c + 1.0);
    return mix(c / (l + 1.0), tc, tc);
}

layout (location = 0) out vec4 outColor;

vec3 SampleSkyviewLUT(vec3 rayDirection, vec3 sunDirection)
{
    const vec3 planetRelativePosition = FindPlanetRelativePosition(CameraPosition_Fov.xyz);

    const float height = length(planetRelativePosition);
    const vec3 up = planetRelativePosition / height;

    const float horizonAngle = safeacos(sqrt(pow(height, 2) - pow(gGroundRadius, 2)) / height);
    const float altitudeAngle = horizonAngle - acos(dot(rayDirection, up));

    const vec3 projectedDirection = normalize(rayDirection - up * dot(rayDirection, up));

    const float azimuthAngle = atan(projectedDirection.x, -projectedDirection.z);
    const float v = 0.5 + 0.5 * sign(altitudeAngle) * sqrt(abs(altitudeAngle) * 2.0 / gPI);
    const vec2 uv = vec2(azimuthAngle / (2.0 * gPI) + .5f, v);

    return texture(skyviewImage, uv).rgb;
}

void main()
{
    const float depth = texelFetch(depthBuffer, ivec2(inUV * textureSize(depthBuffer, 0)), 0).r;
    if (depth >= 1.f)
    {
        const vec3 planetRelativePosition = FindPlanetRelativePosition(CameraPosition_Fov.xyz);
        const float cameraHeight = length(planetRelativePosition);
        const float altitude = GetSunAltitude(Time);
        const vec3 sunDirection = -normalize(vec3(.0f, sin(altitude), -cos(altitude)));
        const vec3 worldUp = vec3(0.0, 1.0, 0.0);
        const vec3 cameraRight = normalize(cross(CameraForward_AspectRatio.xyz, worldUp));
        const vec3 cameraUp = cross(cameraRight, CameraForward_AspectRatio.xyz);
        const vec2 centeredUV = (inUV - .5f) * 2.f;
        const vec3 rayDirection = normalize(
            CameraForward_AspectRatio.xyz +
            cameraRight * centeredUV.x * CameraPosition_Fov.w * CameraForward_AspectRatio.w -
            cameraUp * centeredUV.y * CameraPosition_Fov.w
        );

        vec3 color;
        if (cameraHeight > gAtmosphereRadius || !UseSkyview)
        color = jodieReinhardTonemap(FindSkyScattering(transmittanceImage, multipleScatteringImage
                                     , planetRelativePosition, rayDirection, sunDirection));
        else
        color = jodieReinhardTonemap(SampleSkyviewLUT(rayDirection, sunDirection));

        outColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.f);
    }
    else discard;
}
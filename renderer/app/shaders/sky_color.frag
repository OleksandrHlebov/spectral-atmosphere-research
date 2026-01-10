#version 450
#extension GL_GOOGLE_include_directive: require
#include "spectral_functions.glsl"

layout (constant_id = 0) const bool spectral = false;

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

vec3 GammaCorrect(vec3 linear_srgb)
{
    vec3 a = 12.92 * linear_srgb;
    vec3 b = 1.055 * pow(linear_srgb, vec3(1.0 / 2.4)) - 0.055;
    vec3 c = step(vec3(0.0031308), linear_srgb);
    return mix(a, b, c);
}

vec3 SimpleToneMap(vec3 color)
{
    const float k = 0.05;
    color = 1.0 - exp(-k * color);
    //    color = clamp(GammaCorrect(color), 0.0, 1.0);
    return color;
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
        color = SimpleToneMap(FindSkyScattering(transmittanceImage, multipleScatteringImage
                              , planetRelativePosition, rayDirection, sunDirection, spectral));
        else
        color = SimpleToneMap(SampleSkyviewLUT(rayDirection, sunDirection));

        outColor = vec4(color, 1.f);

    }
    else discard;
}
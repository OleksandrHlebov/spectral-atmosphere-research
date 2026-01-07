// From https://gamedev.stackexchange.com/questions/96459/fast-ray-sphere-collision-code.
float RayIntersectSphere(vec3 ro, vec3 rd, float rad) {
    float b = dot(ro, rd);
    float c = dot(ro, ro) - rad * rad;
    if (c > 0.0f && b > 0.0) return -1.0;
    float discr = b * b - c;
    if (discr < 0.0) return -1.0;
    // Special case: inside sphere, use far discriminant
    if (discr > b * b) return (-b + sqrt(discr));
    return -b - sqrt(discr);
}

// From https://www.shadertoy.com/view/wlBXWK
vec2 RayIntersectSphere2D(
    vec3 start, // starting position of the ray
    vec3 dir, // the direction of the ray
    float radius // and the sphere radius
) {
    // ray-sphere intersection that assumes
    // the sphere is centered at the origin.
    // No intersection when result.x > result.y
    float a = dot(dir, dir);
    float b = 2.0 * dot(dir, start);
    float c = dot(start, start) - (radius * radius);
    float d = (b * b) - 4.0 * a * c;
    if (d < 0.0) return vec2(1e5, -1e5);
    return vec2(
    (-b - sqrt(d)) / (2.0 * a),
    (-b + sqrt(d)) / (2.0 * a)
    );
}

float safeacos(const float x) {
    return acos(clamp(x, -1.0, 1.0));
}

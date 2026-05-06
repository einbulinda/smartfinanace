// Top-level build file where you can add configuration options common to all sub-projects/modules.
buildscript {
    dependencies {
        // Force javapoet 1.13.0 into the buildscript classloader so that Hilt's AggregateDepsTask
        // finds ClassName.canonicalName() instead of the 1.10.0 version bundled by AGP 8.5.2.
        classpath("com.squareup:javapoet:1.13.0")
    }
}

plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
}
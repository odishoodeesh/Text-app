// App-level build.gradle.kts file
plugins {
    id("com.android.application")
    id("com.google.gms.google-services")
}

android {
    namespace = "co.median.android.xlemrmx"
    compileSdk = 34

    defaultConfig {
        applicationId = "co.median.android.xlemrmx"
        minSdk = 21
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}

dependencies {
    // Import the Firebase BoM
    implementation(platform("com.google.firebase:firebase-bom:34.14.0"))

    // Add dependencies for Firebase products
    implementation("com.google.firebase:firebase-analytics")
    implementation("com.google.firebase:firebase-firestore")
    implementation("com.google.firebase:firebase-auth")

    // Remote Sunmi ECR Service dependency
    implementation("com.sunmi:sunmi-ecr-service:3.0.6@aar")
}

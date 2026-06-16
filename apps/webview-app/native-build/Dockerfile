FROM eclipse-temurin:17-jdk-jammy

RUN apt-get update && apt-get install -y wget unzip && rm -rf /var/lib/apt/lists/*

# Install Android SDK
RUN mkdir -p /opt/android-sdk/cmdline-tools && \
    wget -q "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" -O /tmp/cmdtools.zip && \
    unzip -q /tmp/cmdtools.zip -d /opt/android-sdk/cmdline-tools && \
    mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest && \
    rm /tmp/cmdtools.zip

ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${PATH}"

RUN yes | sdkmanager --licenses > /dev/null 2>&1 && \
    sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# Install Gradle
RUN wget -q "https://services.gradle.org/distributions/gradle-8.7-bin.zip" -O /tmp/gradle.zip && \
    mkdir -p /opt/gradle && \
    unzip -qo /tmp/gradle.zip -d /opt/gradle && \
    rm /tmp/gradle.zip

ENV PATH="/opt/gradle/gradle-8.7/bin:${PATH}"

WORKDIR /project
COPY . .

RUN gradle assembleRelease --no-daemon

CMD ["echo", "Build complete"]

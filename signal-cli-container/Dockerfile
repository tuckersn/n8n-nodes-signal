FROM openjdk:21-slim

WORKDIR /opt

RUN apt-get update && apt-get install -y \
    wget \
    tar \
    && rm -rf /var/lib/apt/lists/*

ENV VERSION=0.13.16

RUN wget https://github.com/AsamK/signal-cli/releases/download/v"${VERSION}"/signal-cli-"${VERSION}".tar.gz && \
    tar xf signal-cli-"${VERSION}".tar.gz -C /opt && \
    ln -sf /opt/signal-cli-"${VERSION}"/bin/signal-cli /usr/local/bin/ && \
    rm signal-cli-"${VERSION}".tar.gz && \
    chmod +x /usr/local/bin/signal-cli

RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/*

ADD ./daemon.bash /opt/daemon.bash
ADD ./register_account.py /opt/register_account.py

RUN signal-cli --version
RUN chmod +x /opt/daemon.bash /opt/register_account.py

CMD ["bash", "/opt/daemon.bash"]
#CMD ["sh", "-c", "while :; do sleep 1000; done"]
# Colorgorical (Python 2.7 + C extension) as a palette scorer.
# score.sh builds and runs it as linux/amd64 because that is the only platform PyPI still carries
# Python 2.7 wheels for numpy/scipy/scikit-learn; on Apple silicon Docker runs
# it under emulation. The full (non-slim) 2.7.18 image already ships gcc and
# git, which avoids apt against Debian buster's now-archived repositories.
FROM python:2.7.18

# Last releases of each that support Python 2.7.
RUN pip install --no-cache-dir numpy==1.16.6 scipy==1.2.3 scikit-learn==0.20.4

# connorgr/colorgorical, commit 9064965 (2016-10-14), the last commit on master.
ARG COLORGORICAL_COMMIT=90649656a57ce9743b00390473adce51a821cadc
RUN git init -q /colorgorical \
 && cd /colorgorical \
 && git fetch -q --depth 1 https://github.com/connorgr/colorgorical.git $COLORGORICAL_COMMIT \
 && git checkout -q FETCH_HEAD \
 && cd src/model \
 && python setup.py build_ext --inplace

COPY score.py /colorgorical/score.py
WORKDIR /colorgorical
ENTRYPOINT ["python", "score.py"]

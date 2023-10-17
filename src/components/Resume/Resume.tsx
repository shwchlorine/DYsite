import { FC } from 'react';
import {
    Container,
    VStack,
    Heading
} from '@chakra-ui/react';
import { Element } from 'react-scroll';
import {Fade} from 'react-awesome-reveal';

const Resume: FC = () => {
    return (
        <Element name='resume'>
            <Container maxW={'5xl'} p={6.75} mt={15}>
                <VStack spacing={8}>
                    <Fade>
                        <Heading as='h2'>Resume</Heading>
                    </Fade>
                    <Container>
                        <Fade cascade>
                            <iframe src="https://drive.google.com/file/d/1D_CRQLavab1_ue3S26icUss1OkMG0gIC/preview" width="100%" height="480" allow="autoplay" title="Jason Wang Resume"></iframe>
                        </Fade>
                    </Container>
                </VStack>
            </Container>
        </Element>
    );
};

export default Resume;
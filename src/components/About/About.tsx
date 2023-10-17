import { FC } from 'react';
import {
    Container,
    Heading,
    Stack,
    Image,
    VStack,
    Text,
    useColorModeValue,
    Flex,
    Center
} from '@chakra-ui/react';
import { Element } from 'react-scroll';
import {Fade} from 'react-awesome-reveal';
import headshot from '../../media/headshot.jpg'

const About: FC = () => {
    return (
        <Element name='aboutme'>
            <Container maxW={'5xl'} p={6.75} mt={[20, 10]}>
                <VStack spacing={8}>
                    <Fade>
                        <Heading as='h2'>About me</Heading>
                    </Fade>
                    <Stack position='relative' alignItems='center' direction={['column', 'row']} textAlign={{base: 'left',  sm: 'justify', lg: 'left'}}>
                        <Image
                            borderRadius='full'
                            boxSize='150px'
                            src={headshot}
                            border={`3px solid ${useColorModeValue('#1E2428', '#ECEFF4')}`}
                        />
                        <VStack spacing={4} p={[10, 4]} pl={[10, 50]}>
                            <Fade cascade duration={500}>
                                <Flex>
                                    <Center p={4}>👋🏼</Center>
                                    <Text>
                                    Hi, I'm Derrick, a Product Manager with a background in business development and a knack for scaling operations in the digital realm. My journey has exposed me to diverse industries and challenges, shaping my approach to modern business solutions.                                    </Text>
                                </Flex>
                            </Fade>
                            <Fade cascade duration={500}>
                                <Flex>
                                    <Center p={4}>🎓</Center>
                                    <Text>
                                    I'm actively searching for a product-based role in NYC, and eager to apply my technical expertise and robust digital strategy background to drive transformative solutions
                                    </Text>
                                </Flex>
                            </Fade>
                            <Fade cascade duration={500}>
                                <Flex>
                                    <Center p={4}>👨🏻‍💻</Center>
                                    <Text>
                                    After graduating, I founded <b>DigiWorld</b> and am currently working as Business Development Executive at BingX Exchange. 
                                    </Text>
                                </Flex>
                            </Fade>
                            <Fade cascade duration={500}>
                                <Flex>
                                    <Center p={4}>🚀</Center>
                                    <Text>
                                        In my professional journey, I've honed skills in tools such as <b>No-code platforms</b> (Figma/Webflow/Bubble), <b>CRM Platforms</b> (Salesforce/Pipedrive), as well as <b>Product Roadmapping</b>. These tools, coupled with my understanding of digital trends, have been essential in formulating strategies and executing them efficiently. While I've been fortunate to see positive outcomes, I always believe there's room for growth and new learning experiences. 
                                    </Text>
                                </Flex>
                            </Fade>
                           
                        </VStack>
                    </Stack>
                </VStack>
            </Container>
        </Element>
    );
};

export default About;